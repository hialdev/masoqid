// connection/wa.go
package connection

import (
	"aldev/modules/auth/models"
	"aldev/utils"
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"
	"gorm.io/gorm"
)

var (
	client    *whatsmeow.Client
	container *sqlstore.Container
	clientMux sync.RWMutex
	waCtx     = context.Background()
)

// Constants untuk pesan dan konfigurasi
const (
	DefaultLoginCommand = "Hi, DocTracker saya mau masuk ke aplikasi dong"
	OTPLength           = 6
	OTPExpiryDuration   = 10 * time.Minute
	MessageTemplate     = `Halo! Silakan lanjutkan permintaan *%s* kamu dengan klik link berikut:

%s

Jangan berikan kode atau link ini ke siapapun.
Terima kasih.`
)

// OTPPurpose enum untuk tipe OTP
type OTPPurpose string

const (
	PurposeRegister OTPPurpose = "register"
	PurposeLogin    OTPPurpose = "login"
	PurposeVerify   OTPPurpose = "verify"
)

// eventHandler menangani event WhatsApp yang masuk
func eventHandler(evt interface{}) {
	switch v := evt.(type) {
	case *events.Message:
		handleIncomingMessage(v)
	}
}

// handleIncomingMessage memproses pesan WhatsApp yang masuk
func handleIncomingMessage(msg *events.Message) {
	// Skip pesan dari diri sendiri
	if msg.Info.MessageSource.IsFromMe {
		return
	}

	// Skip pesan dari group - hanya proses pesan personal/individual
	if msg.Info.MessageSource.IsGroup {
		// log.Printf("Ignoring message from group: %s", msg.Info.Chat.User)
		return
	}

	// Skip pesan dari broadcast list
	if msg.Info.MessageSource.IsIncomingBroadcast() {
		return
	}

	// Skip pesan dari status/story
	if msg.Info.Chat.Server == types.BroadcastServer {
		return
	}

	// Ekstrak teks pesan
	messageText := extractMessageText(msg.Message)
	if messageText == "" {
		return
	}

	// Cek apakah pesan adalah perintah login
	if isLoginCommand(messageText) {
		sender := msg.Info.SenderAlt.UserInt()
		senderStr := strconv.FormatUint(sender, 10)
		go handleLoginCommand(senderStr)
	}
}

// extractMessageText mengekstrak teks dari berbagai tipe pesan WhatsApp
func extractMessageText(message *waProto.Message) string {
	if message == nil {
		return ""
	}

	// Cek conversation message
	if text := message.GetConversation(); text != "" {
		return text
	}

	// Cek extended text message
	if extMsg := message.GetExtendedTextMessage(); extMsg != nil {
		return extMsg.GetText()
	}

	// Bisa ditambahkan tipe pesan lain sesuai kebutuhan
	return ""
}

// isLoginCommand mengecek apakah pesan adalah perintah login
func isLoginCommand(messageText string) bool {
	loginCmd := getLoginCommand()
	return strings.EqualFold(strings.TrimSpace(messageText), strings.TrimSpace(loginCmd))
}

// getLoginCommand mendapatkan perintah login dari environment variable
func getLoginCommand() string {
	if cmd := os.Getenv("LOGIN_COMMAND"); cmd != "" {
		return cmd
	}
	return DefaultLoginCommand
}

// LoginRequest struktur untuk request login
type LoginRequest struct {
	Phone   string
	Purpose OTPPurpose
	Code    string
}

// handleLoginCommand memproses perintah login dari pengguna
func handleLoginCommand(sender string) {
	log.Printf("Processing login command from: %s", sender)
	
	// Pastikan nomor diawali dengan '+'
	if !strings.HasPrefix(sender, "+") {
		sender = "+" + sender
	}

	// Validasi nomor WhatsApp
	if !isValidWhatsAppNumber(sender) {
		log.Printf("Invalid WhatsApp number: %s", sender)
		return
	}

	// Tentukan purpose berdasarkan status user
	purpose, err := determinePurpose(sender)
	if err != nil {
		log.Printf("Failed to determine purpose for %s: %v", sender, err)
		return
	}

	// Generate dan simpan OTP
	otpCode, err := generateAndSaveOTP(sender, purpose)
	if err != nil {
		log.Printf("Failed to generate OTP for %s: %v", sender, err)
		return
	}
	fmt.Printf("Generated OTP for %s: %s", sender, otpCode)

	// Buat user jika belum ada (untuk registrasi)
	if purpose == PurposeRegister {
		if err := createUserIfNotExists(sender); err != nil {
			log.Printf("Failed to create user for %s: %v", sender, err)
			return
		}
	}

	// Kirim pesan dengan link login
	if err := sendLoginMessage(sender, string(purpose), otpCode); err != nil {
		log.Printf("Failed to send login message to %s: %v", sender, err)
	}
}

// isValidWhatsAppNumber mengecek apakah nomor WhatsApp valid
func isValidWhatsAppNumber(phoneNumber string) bool {
	isValid, err := CheckNumber(phoneNumber)
	if err != nil {
		log.Printf("Error checking WhatsApp number %s: %v", phoneNumber, err)
		return false
	}
	return isValid
}

// determinePurpose menentukan tujuan OTP berdasarkan status user
func determinePurpose(phoneNumber string) (OTPPurpose, error) {
	var user models.User
	db := DB

	err := db.First(&user, "phone = ?", phoneNumber).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return PurposeRegister, nil
		}
		return "", fmt.Errorf("database error: %w", err)
	}

	// User sudah ada, cek status
	if user.Username != nil && *user.Username != "" {
		return PurposeLogin, nil
	}

	if user.PhoneVerifiedAt == nil {
		return PurposeVerify, nil
	}

	return PurposeLogin, nil
}

// generateAndSaveOTP membuat dan menyimpan OTP ke database
func generateAndSaveOTP(phoneNumber string, purpose OTPPurpose) (string, error) {
	db := DB
	// Generate OTP unik
	code, err := GenerateUniqueOTP(db)
	if err != nil {
		return "", fmt.Errorf("failed to generate unique OTP: %w", err)
	}

	// Hapus OTP yang sudah ada untuk nomor ini
	if err := db.Where("phone = ? AND purpose = ?", phoneNumber, purpose).Delete(&models.Otp{}).Error; err != nil {
		return "", fmt.Errorf("failed to delete existing OTP: %w", err)
	}

	// Simpan OTP ke database
	otp := models.Otp{
		Phone:     &phoneNumber,
		Code:      code,
		ExpiredAt: time.Now().Add(OTPExpiryDuration),
		Purpose:   string(purpose),
	}

	if err := db.Create(&otp).Error; err != nil {
		return "", fmt.Errorf("failed to save OTP: %w", err)
	}

	return code, nil
}

// createUserIfNotExists membuat user baru jika belum ada
func createUserIfNotExists(phoneNumber string) error {
	db := DB
	user := models.User{Phone: &phoneNumber}

	if err := db.FirstOrCreate(&user, user).Error; err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

// sendLoginMessage mengirim pesan login dengan link verifikasi
func sendLoginMessage(phoneNumber, purpose, otpCode string) error {
	verifyURL := os.Getenv("VERIFY_URL")
	if verifyURL == "" {
		return fmt.Errorf("VERIFY_URL not configured")
	}

	// Buat login link
	loginLink := fmt.Sprintf("%s?phone=%s&code=%s&purpose=%s", verifyURL, phoneNumber, otpCode, purpose)

	// Format pesan
	message := fmt.Sprintf(MessageTemplate, purpose, loginLink)

	// Kirim pesan dengan retry
	return SendMessageWithRetry(phoneNumber, message, 3)
}

// GenerateUniqueOTP membuat OTP unik yang belum ada di database
func GenerateUniqueOTP(db *gorm.DB) (string, error) {
	const maxAttempts = 10

	for attempt := 0; attempt < maxAttempts; attempt++ {
		code := utils.GenerateRandomOTP(OTPLength)

		var count int64
		if err := db.Model(&models.Otp{}).Where("code = ?", code).Count(&count).Error; err != nil {
			return "", fmt.Errorf("database error while checking OTP uniqueness: %w", err)
		}

		if count == 0 {
			return code, nil
		}
	}

	return "", fmt.Errorf("failed to generate unique OTP after %d attempts", maxAttempts)
}

// GetWAClient mendapatkan instance WhatsApp client dengan thread-safe
func GetWAClient() *whatsmeow.Client {
	clientMux.RLock()
	defer clientMux.RUnlock()
	return client
}

// InitWAClient menginisialisasi WhatsApp client
func InitWAClient() error {
	clientMux.Lock()
	defer clientMux.Unlock()

	store.DeviceProps.Os = proto.String("AL WhatsApp")

	if client != nil {
		return nil
	}

	// Setup database dengan log level yang lebih rendah
	dbLog := waLog.Stdout("Database", "ERROR", true)
	var err error
	container, err = sqlstore.New(waCtx, "sqlite3", "file:wa_agent.db?_foreign_keys=on", dbLog)
	if err != nil {
		return fmt.Errorf("failed to create SQLite container: %w", err)
	}

	// Get device store
	deviceStore, err := container.GetFirstDevice(waCtx)
	if err != nil {
		return fmt.Errorf("failed to get device store: %w", err)
	}

	// Create client dengan log level yang lebih rendah
	clientLog := waLog.Stdout("Client", "ERROR", true)
	client = whatsmeow.NewClient(deviceStore, clientLog)
	client.AddEventHandler(eventHandler)

	if client.Store.ID != nil {
		if err := client.Connect(); err != nil {
			return fmt.Errorf("failed to connect WhatsApp client: %w", err)
		}
	}

	return nil
}

// ConnectWA menghubungkan ke WhatsApp dan mengembalikan QR channel
func ConnectWA() (<-chan whatsmeow.QRChannelItem, error) {
	clientMux.RLock()
	defer clientMux.RUnlock()

	if client == nil {
		return nil, fmt.Errorf("client not initialized")
	}

	if client.IsConnected() {
		return nil, nil
	}

	// Get QR channel
	qrChan, err := client.GetQRChannel(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to get QR channel: %w", err)
	}

	// Connect in background
	go func() {
		if err := client.Connect(); err != nil {
			log.Printf("Failed to connect WhatsApp client: %v", err)
		}
	}()

	return qrChan, nil
}

// DisconnectWA memutuskan koneksi WhatsApp
func DisconnectWA() error {
	clientMux.Lock()
	defer clientMux.Unlock()

	if client != nil {
		// Logout untuk membersihkan session di server WhatsApp
		if client.IsConnected() {
			if err := client.Logout(waCtx); err != nil {
				// Jika logout gagal, tetap lanjut disconnect
				client.Disconnect()
			}
		} else {
			client.Disconnect()
		}

		// Tunggu cleanup
		time.Sleep(2 * time.Second)

		// Clear device dari database untuk memastikan cleanup
		if client.Store != nil {
			if err := client.Store.Delete(waCtx); err != nil {
				log.Printf("Failed to delete device from store: %v", err)
			}
		}

		client = nil
	}

	// Optional: Close container connection
	if container != nil {
		container.Close()
		container = nil
	}

	return nil
}

// ForceCleanup membersihkan semua resource WhatsApp secara paksa
func ForceCleanup() error {
	clientMux.Lock()
	defer clientMux.Unlock()

	// Force disconnect jika masih ada client
	if client != nil {
		if client.IsConnected() {
			client.Disconnect()
		}
		// Delete device store
		if client.Store != nil {
			client.Store.Delete(waCtx)
		}
		client = nil
	}

	// Close container
	if container != nil {
		container.Close()
		container = nil
	}

	// Hapus database file
	dbPath := "wa_agent.db"
	if _, err := os.Stat(dbPath); err == nil {
		return os.Remove(dbPath)
	}

	return nil
}

// IsConnected mengecek status koneksi WhatsApp
func IsConnected() bool {
	clientMux.RLock()
	defer clientMux.RUnlock()

	if client == nil {
		return false
	}
	return client.IsConnected()
}

// GetUserID mendapatkan ID user WhatsApp yang sedang aktif
func GetUserID() string {
	clientMux.RLock()
	defer clientMux.RUnlock()

	if client == nil || client.Store.ID == nil {
		return ""
	}
	return client.Store.ID.User
}

// ResetWAClient mereset client WhatsApp secara complete
func ResetWAClient() error {
	clientMux.Lock()
	defer clientMux.Unlock()

	// Force disconnect
	if client != nil {
		if client.IsConnected() {
			client.Disconnect()
		}
		// Delete device store
		if client.Store != nil {
			client.Store.Delete(waCtx)
		}
		time.Sleep(1 * time.Second)
		client = nil
	}

	// Close container
	if container != nil {
		container.Close()
		container = nil
	}

	// Hapus database dan buat ulang
	dbPath := "wa_agent.db"
	os.Remove(dbPath)

	// Re-initialize
	dbLog := waLog.Stdout("Database", "ERROR", true)
	var err error
	container, err = sqlstore.New(waCtx, "sqlite3", "file:wa_agent.db?_foreign_keys=on", dbLog)
	if err != nil {
		return fmt.Errorf("failed to recreate container: %w", err)
	}

	deviceStore, err := container.GetFirstDevice(waCtx)
	if err != nil {
		return fmt.Errorf("failed to get device store: %w", err)
	}

	clientLog := waLog.Stdout("Client", "ERROR", true)
	client = whatsmeow.NewClient(deviceStore, clientLog)

	return nil
}

// SendTextMessage mengirim pesan teks ke nomor WhatsApp
func SendTextMessage(to, message string) error {
	clientMux.RLock()
	defer clientMux.RUnlock()

	if client == nil {
		return fmt.Errorf("client not initialized")
	}

	if !client.IsConnected() {
		return fmt.Errorf("client not connected")
	}

	// Format nomor WhatsApp
	jid, err := parsePhoneNumber(to)
	if err != nil {
		return fmt.Errorf("invalid phone number format: %w", err)
	}
	fmt.Printf("Parsed JID: %s\n", jid)

	// Buat pesan
	msg := &waProto.Message{
		Conversation: proto.String(message),
	}

	fmt.Printf("Sending message to %s: %s\n", jid, message)
	// Kirim pesan
	_, err = client.SendMessage(context.Background(), jid, msg)
	if err != nil {
		return fmt.Errorf("failed to send message: %w", err)
	}

	return nil
}

// parsePhoneNumber memformat nomor telepon ke format WhatsApp JID
func parsePhoneNumber(phoneNumber string) (types.JID, error) {

	// Clean dan format nomor jika parsing gagal
	cleanNumber := cleanPhoneNumber(phoneNumber)
	fmt.Printf("Cleaning phone number: %s -> %s\n", phoneNumber, cleanNumber)

	// Tambahkan @s.whatsapp.net jika belum ada
	if !strings.Contains(cleanNumber, "@") {
		// Jika nomor dimulai dengan 0, ganti dengan 62 (Indonesia)
		if strings.HasPrefix(cleanNumber, "0") {
			cleanNumber = "62" + cleanNumber[1:]
		}

		cleanNumber += "@s.whatsapp.net"
	}

	return types.ParseJID(cleanNumber)
}

// cleanPhoneNumber membersihkan nomor telepon dari karakter non-digit
func cleanPhoneNumber(phoneNumber string) string {
	var cleanNumber strings.Builder
	for _, char := range phoneNumber {
		if char >= '0' && char <= '9' {
			cleanNumber.WriteRune(char)
		}
	}
	return cleanNumber.String()
}

// SendMessageWithRetry mengirim pesan dengan retry mechanism
func SendMessageWithRetry(to, message string, maxRetries int) error {
	var lastErr error

	for i := 0; i < maxRetries; i++ {
		err := SendTextMessage(to, message)
		if err == nil {
			return nil
		}

		lastErr = err

		// Jika client tidak connected, jangan retry
		if strings.Contains(err.Error(), "not connected") {
			break
		}

		// Wait sebelum retry dengan exponential backoff
		if i < maxRetries-1 {
			time.Sleep(time.Duration(i+1) * time.Second)
		}
	}

	return lastErr
}

// CheckNumber mengecek apakah nomor WhatsApp valid/terdaftar
func CheckNumber(phoneNumber string) (bool, error) {
	clientMux.RLock()
	defer clientMux.RUnlock()

	if client == nil {
		return false, fmt.Errorf("client not initialized")
	}

	if !client.IsConnected() {
		return false, fmt.Errorf("client not connected")
	}

	// Format nomor
	cleanNumber := cleanPhoneNumber(phoneNumber)

	if strings.HasPrefix(cleanNumber, "0") {
		cleanNumber = "62" + cleanNumber[1:]
	}

	if !strings.HasPrefix(cleanNumber, "+") {
		cleanNumber = "+" + cleanNumber
	}

	if !strings.Contains(cleanNumber, "@") {
		cleanNumber += "@s.whatsapp.net"
	}

	jid, err := types.ParseJID(cleanNumber)
	if err != nil {
		return false, fmt.Errorf("failed to parse JID: %w", err)
	}

	// Check if number is registered on WhatsApp
	resp, err := client.IsOnWhatsApp(waCtx, []string{jid.User})
	if err != nil {
		return false, fmt.Errorf("failed to check WhatsApp registration: %w", err)
	}

	if len(resp) > 0 {
		return resp[0].IsIn, nil
	}

	return false, nil
}
