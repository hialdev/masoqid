package handlers

import (
	"aldev/connection"
	"aldev/modules/auth/models"
	"aldev/modules/auth/services"
	"aldev/utils"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/nyaruka/phonenumbers"
	"gorm.io/gorm"
)

type OtpHandler struct {
	DB *gorm.DB
}

/*
Kondisi :
-> Masukan email / phone
-> Cek apakah sudah terdaftar, kalau sudah maka tentukan purpose
-> Buat data OTP dan kaitkan
-> Jika email maka kirim OTP via Email
-> Jika phone maka kirim OTP via WhatsApp
*/
func (h *OtpHandler) SendOTP(c *fiber.Ctx) error {
	var input struct {
		Login       string `json:"login" validate:"required"` // email / phone
		IsEmail     bool   `json:"is_email"`
		CountryCode *string `json:"country_code"`
	}

	// Parsing request body
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
	}

	// Validasi input
	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	if !input.IsEmail && *input.CountryCode != "" {
		countryCode := phonenumbers.GetCountryCodeForRegion(*input.CountryCode)
		if countryCode == 0 {
			return utils.RespApi(c, "bad","Kode negara ISO tidak valid", nil)
		}
	}

	// Generate kode OTP
	code, err := GenerateUniqueOTP(h.DB)
	if err != nil {
		return utils.RespApi(c, "ise", "Tidak dapat membuat Kode OTP", err.Error())
	}

	// Cek apakah user sudah ada → tentukan purpose
	var usr models.User
	var purpose string
	var lookupValue string

	lookupField := "phone = ?"
	if input.IsEmail {
		lookupField = "email = ?"
		lookupValue = input.Login
	} else {
		sanitize, err := utils.NormalizePhone(input.Login, *input.CountryCode)
		if err != nil {
			return utils.RespApi(c, "bad", "Nomor telepon tidak valid!", err.Error())
		} else {
			lookupValue = sanitize
		}
	}

	if err := h.DB.First(&usr, lookupField, lookupValue).Error; err != nil {
		purpose = "register"
	} else if usr.Username != nil && *usr.Username != "" {
		purpose = "login"
	} else {
		purpose = "verify"
	}

	// Kalau purpose register → buat user baru
	if purpose == "register" {
		user := models.User{}
		if input.IsEmail {
			user.Email = &lookupValue
		} else {
			user.Phone = &lookupValue
		}
		user.CountryCode = input.CountryCode

		if err := h.DB.FirstOrCreate(&user, user).Error; err != nil {
			return utils.RespApi(c, "ise", "Gagal menyimpan Data User", err.Error())
		}
		fmt.Print("register when Send OTP", input, user, purpose)
	}

	// Siapkan OTP record
	var otp models.Otp
	if input.IsEmail {
		otp = models.Otp{
			Email:     &lookupValue,
			Phone:     nil,
			IsEmail:   true,
			Code:      code,
			ExpiredAt: time.Now().Add(10 * time.Minute),
			Purpose:   purpose,
		}
	} else {
		otp = models.Otp{
			Phone:     &lookupValue,
			Email:     nil,
			IsEmail:   false,
			Code:      code,
			ExpiredAt: time.Now().Add(10 * time.Minute),
			Purpose:   purpose,
		}
	}

	// Simpan OTP ke DB
	if err := h.DB.Create(&otp).Error; err != nil {
		return utils.RespApi(c, "ise", "Tidak dapat membuat record OTP", err.Error())
	}

	// Kalau via email → kirim email
	if input.IsEmail {
		name := otp.Email
		if usr.Username != nil && *usr.Username != "" {
			name = usr.Username
		}
		// Buat fungsi kirim email OTP
		err := h.sendEmailOTP(*otp.Email, "Hey Bro.. This is your OTP Code!😎", "Mr/s "+*name, otp.Code)
		if err != nil {
			return utils.RespApi(c, "ise", "Failed send Email OTP to "+*otp.Email, err.Error())
		}
		return utils.RespApi(c, "ok", "OTP berhasil dikirim via Email", otp)
	}

	// Kalau via WhatsApp → siapkan pesan
	autoLoginLink := fmt.Sprintf(
		"%s?phone=%s&code=%s&purpose=%s",
		os.Getenv("VERIFY_URL"), *otp.Phone, otp.Code, otp.Purpose,
	)

	loginMessage := fmt.Sprintf(
		"Hallo, Silahkan lanjutkan Permintaan %s kamu pada %s dengan memasukan kode %s \n\natau klik link berikut: \n\n%s \n\nTerimakasih!\n\n[Perhatian]\nJangan berikan kode / link ini pada siapapun!",
		otp.Purpose, os.Getenv("APP_NAME"), otp.Code, autoLoginLink,
	)

	req := SendMessageRequest{
		To:      *otp.Phone,
		Message: loginMessage,
	}

	// Validasi nomor WhatsApp
	isValidNumber := false
	isValid, err := connection.CheckNumber(req.To)
	if err != nil {
		log.Printf("Failed to check number %s: %v", req.To, err)
	} else {
		isValidNumber = isValid
		if !isValid {
			return c.Status(400).JSON(SendMessageResponse{
				Success: false,
				Message: "Phone number is not registered on WhatsApp",
				Data: &SendMessageData{
					To:            req.To,
					Message:       req.Message,
					IsValidNumber: &isValidNumber,
				},
			})
		}
	}

	// Kirim pesan WhatsApp
	if err := sendMessageService(c, req, isValidNumber); err != nil {
		return utils.RespApi(c, "ise", "Kesalahan dalam mengirim pesan whatsapp", err.Error())
	}

	return utils.RespApi(c, "ok", "OTP berhasil dikirim", otp)
}

func (h *OtpHandler) ChangeSecurityOTP(c *fiber.Ctx) error {
	var input struct {
		UserID      string `json:"user_id" validate:"required"`
		Email       *string `json:"email" validate:"omitempty,email"`
		Phone       *string `json:"phone" validate:"omitempty,numeric,min=10,max=15"`
		IsEmail     bool   `json:"is_email"`
		CountryCode *string `json:"country_code"`
	}

	// Parsing request body
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
	}

	// Validasi input
	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	// -----------------------

	var userID string

	// Ambil user ID dari access token jika ada
	user := c.Locals("user")
	if user != nil {
		token := user.(*jwt.Token)
		claims := token.Claims.(jwt.MapClaims)
		userID = claims["user_id"].(string)
	} else {
		// Jika tidak ada access token, coba ambil dari refresh token di cookie
		refreshToken := c.Cookies("refreshToken")
		if refreshToken != "" {
			token, err := jwt.Parse(refreshToken, func(token *jwt.Token) (any, error) {
				return []byte(os.Getenv("APP_SECRET")), nil
			})
			if err == nil && token.Valid {
				claims := token.Claims.(jwt.MapClaims)
				userID = claims["user_id"].(string)
			}
		}
	}

	if userID == "" || input.UserID == "" || input.UserID != userID {
		return utils.RespApi(c, "bad", "User ID tidak valid", fiber.Map{
			"user_id": userID,
			"input_user_id": input.UserID,
		})
	}

	// -----------------------

	// Validasi is Email dan inputannya
	if input.IsEmail {
		if input.Email == nil || *input.Email == "" {
			return utils.RespApi(c, "bad", "Email tidak valid", nil)
		}
	} else {
		if input.Phone == nil || *input.Phone == "" {
			return utils.RespApi(c, "bad", "Nomor telepon tidak valid", nil)
		}
		countryCode := phonenumbers.GetCountryCodeForRegion(*input.CountryCode)
		if countryCode == 0 {
			return utils.RespApi(c, "bad","Kode negara ISO tidak valid", nil)
		}
	}

	// Generate kode OTP
	code, err := GenerateUniqueOTP(h.DB)
	if err != nil {
		return utils.RespApi(c, "ise", "Tidak dapat membuat Kode OTP", err.Error())
	}

	// Cek apakah user sudah ada → tentukan purpose
	var purpose string
	var lookupValue string

	if input.IsEmail {
		lookupValue = *input.Email
	} else {
		sanitize, err := utils.NormalizePhone(*input.Phone, *input.CountryCode)
		if err != nil {
			return utils.RespApi(c, "bad", "Nomor telepon tidak valid!", err.Error())
		} else {
			lookupValue = sanitize
		}
	}

	purpose = "changes"

	// Siapkan OTP record
	var otp models.Otp
	if input.IsEmail {
		otp = models.Otp{
			Email:     &lookupValue,
			Phone:     nil,
			IsEmail:   true,
			Code:      code,
			ExpiredAt: time.Now().Add(10 * time.Minute),
			Purpose:   purpose,
		}
	} else {
		otp = models.Otp{
			Phone:     &lookupValue,
			Email:     nil,
			IsEmail:   false,
			Code:      code,
			ExpiredAt: time.Now().Add(10 * time.Minute),
			Purpose:   purpose,
		}
	}

	// Simpan OTP ke DB
	if err := h.DB.Create(&otp).Error; err != nil {
		return utils.RespApi(c, "ise", "Tidak dapat membuat record OTP", err.Error())
	}

	// Ambil data user 
	var usr models.User
	if err := h.DB.Where("id = ?", userID).First(&usr).Error; err != nil {
		return utils.RespApi(c, "ise", "Tidak dapat mengambil data user", err.Error())
	}

	// Kalau via email → kirim email
	if input.IsEmail {
		name := otp.Email
		if usr.Username != nil && *usr.Username != "" {
			name = usr.Username
		}
		// Buat fungsi kirim email OTP
		err := h.sendEmailOTP(*otp.Email, "Hey Bro.. This is your OTP Code!😎", "Mr/s "+*name, otp.Code)
		if err != nil {
			return utils.RespApi(c, "ise", "Failed send Email OTP to "+*otp.Email, err.Error())
		}
		return utils.RespApi(c, "ok", "OTP berhasil dikirim via Email", otp)
	}

	// Kalau via WhatsApp → siapkan pesan
	autoLoginLink := fmt.Sprintf(
		"%s?phone=%s&code=%s&purpose=%s",
		os.Getenv("VERIFY_URL"), *otp.Phone, otp.Code, otp.Purpose,
	)

	loginMessage := fmt.Sprintf(
		"Hallo, Silahkan lanjutkan Permintaan %s kamu pada %s dengan memasukan kode %s \n\natau klik link berikut: \n\n%s \n\nTerimakasih!\n\n[Perhatian]\nJangan berikan kode / link ini pada siapapun!",
		otp.Purpose, os.Getenv("APP_NAME"), otp.Code, autoLoginLink,
	)

	req := SendMessageRequest{
		To:      *otp.Phone,
		Message: loginMessage,
	}

	// Validasi nomor WhatsApp
	isValidNumber := false
	isValid, err := connection.CheckNumber(req.To)
	if err != nil {
		log.Printf("Failed to check number %s: %v", req.To, err)
	} else {
		isValidNumber = isValid
		if !isValid {
			return c.Status(400).JSON(SendMessageResponse{
				Success: false,
				Message: "Phone number is not registered on WhatsApp",
				Data: &SendMessageData{
					To:            req.To,
					Message:       req.Message,
					IsValidNumber: &isValidNumber,
				},
			})
		}
	}

	// Kirim pesan WhatsApp
	if err := sendMessageService(c, req, isValidNumber); err != nil {
		return utils.RespApi(c, "ise", "Kesalahan dalam mengirim pesan whatsapp", err.Error())
	}

	return utils.RespApi(c, "ok", "OTP berhasil dikirim", otp)
}

func GenerateUniqueOTP(db *gorm.DB) (string, error) {
	var code string
	for {
		code = utils.GenerateRandomOTP(6)

		var count int64
		if err := db.Model(&models.Otp{}).Where("code = ?", code).Count(&count).Error; err != nil {
			return "", err
		}
		if count == 0 {
			break
		}
	}
	return code, nil
}

func (h *OtpHandler) ValidateOTP(c *fiber.Ctx) error {
	var input struct {
		Code    string `json:"code" validate:"required,len=6"`
		Purpose string `json:"purpose" validate:"oneof=register changes verify login"`
	}

	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	var otp models.Otp
	if err := h.DB.
		Where("LOWER(code) = ?", strings.ToLower(input.Code)).
		Where("purpose = ?", input.Purpose).
		First(&otp).Error; err != nil {
		return utils.RespApi(c, "empty", "Kode OTP tidak ditemukan / tidak cocok", err.Error())
	}

	loc, _ := time.LoadLocation(os.Getenv("APP_TIMEZONE"))
	now := time.Now().In(loc)

	if otp.ExpiredAt.Before(now) {
		return utils.RespApi(c, "perm", "Kode OTP sudah kedaluwarsa", nil)
	}

	// Jika Register purpose maka update verified_at pada User
	lookupField := "phone = ?"
	lookupValue := otp.Phone
	verified := true
	update := models.User{PhoneVerifiedAt: &verified}

	if otp.IsEmail {
		lookupField = "email = ?"
		lookupValue = otp.Email
		update = models.User{EmailVerifiedAt: &verified}
	}

	if otp.Purpose == "verify" || otp.Purpose == "register" {
		user := models.User{
			Phone: otp.Phone,
		}

		if err := h.DB.First(&user, lookupField, lookupValue).Error; err != nil {
			return utils.RespApi(c, "ise", "Tidak menemukan User", err.Error())
		}

		if err := h.DB.Model(&user).Updates(update).Error; err != nil {
			return utils.RespApi(c, "ise", "Gagal memverifikasi User", err.Error())
		}
	}

	// Jika Login purpose maka hanya cek apakah User ada
	if otp.Purpose == "login" {
		user := models.User{
			Phone: otp.Phone,
		}
		if err := h.DB.First(&user, lookupField, lookupValue).Error; err != nil {

			return utils.RespApi(c, "ise", "Tidak menemukan User", err.Error())
		}
	}

	if err := h.DB.Delete(&models.Otp{}, lookupField, lookupValue).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal membersihkan OTP setelah Validasi", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil validasi OTP", nil)
}

func (h *OtpHandler) sendEmailOTP(to, title, name, code string) error {
	message := fmt.Sprintf("Input OTP code \n\n'%s' \nfor continue your action, [Warning] Don't share this code to anyone!", code)
	data := map[string]interface{}{
		"Title":   title,
		"Name":    name,
		"Code":    code,
		"Message": message,
	}
	err := services.SendEmailWithTemplate(to, title, "./templates/emails/otp.html", data)
	if err != nil {
		log.Println("Error template:", err)
		return err
	}

	return nil
}
