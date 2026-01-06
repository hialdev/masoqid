package services

import (
	"aldev/connection"
	"aldev/modules/auth/models"
	"aldev/utils"
	"context"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/nyaruka/phonenumbers"
	"gorm.io/gorm"
)

type AuthService struct {
	DB *gorm.DB
}

func NewAuthService(db *gorm.DB) *AuthService {
	return &AuthService{DB: db}
}

//---------------------------------------------------------------------------------------------------- Utilities

// generate token
func generateTokenWithPermissions(userID string, typeToken string, expiry time.Duration, permissions []string) (string, error) {
	claims := jwt.MapClaims{
		"user_id":     userID,
		"type":        typeToken,
		"permissions": permissions,
		"exp":         time.Now().Add(expiry).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(os.Getenv("APP_SECRET")))
}

func generateToken(userID string, typeToken string, expiry time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"type":    typeToken,
		"exp":     time.Now().Add(expiry).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(os.Getenv("APP_SECRET")))
}

// ambil permission user
func (s *AuthService) GetUserPermissions(userID string) ([]string, error) {
	var user models.User
	var permissions []string

	err := s.DB.Preload("Role.Permissions").Find(&user, "id = ?", userID).Error
	if err != nil {
		return nil, err
	}

	if user.RoleID == nil {
		return []string{}, nil
	}

	for _, p := range user.Role.Permissions {
		if p.Name != "" {
			permissions = append(permissions, p.Name)
		}
	}

	return permissions, nil
}

//---------------------------------------------------------------------------------------------------- Core
//-------------------------------------------
//------------- Base Auth -----------------
//-------------------------------------------

func (s *AuthService) Login(login, code, purpose string) (string, string, models.User, []string, error) {
	var otp models.Otp
	if err := s.DB.
		Where("LOWER(code) = ?", strings.ToLower(code)).
		Where("purpose = ?", purpose).
		Order("created_at desc").
		First(&otp).Error; err != nil {
		return "", "", models.User{}, nil, errors.New("OTP tidak valid")
	}

	// cek expired
	if otp.ExpiredAt.Before(time.Now()) {
		return "", "", models.User{}, nil, errors.New("OTP expired")
	}

	var user models.User

	if err := s.DB.Preload("Role").
		Where("username = ? OR phone = ? OR email = ?", login, otp.Phone, login).
		First(&user).Error; err != nil {
		return "", "", models.User{}, nil, errors.New("user tidak ditemukan")
	}

	permissions, err := s.GetUserPermissions(user.ID.String())
	if err != nil {
		return "", "", models.User{}, nil, err
	}

	accessToken, _ := generateTokenWithPermissions(user.ID.String(), "access", time.Hour, permissions)
	refreshToken, _ := generateToken(user.ID.String(), "refresh", time.Hour*24*7)

	// simpan refresh token
	_ = connection.SetToken("refresh:"+user.ID.String(), refreshToken, time.Hour*24*7)

	// bersihkan otp
	_ = s.DB.Delete(&models.Otp{}, "phone = ? OR email = ?", otp.Phone, otp.Email).Error

	return accessToken, refreshToken, user, permissions, nil
}

func (s *AuthService) Register(phone, countryCode, name, username, email string, isEmail bool) (models.User, error) {
	// cari user existing
	var user models.User
	var lookupValue string

	if countryCode == "" {
		parsed, err := phonenumbers.Parse(phone, "")
		if err == nil {
			countryCode = phonenumbers.GetRegionCodeForNumber(parsed)
		}
	}

	lookupField := "phone = ?"
	sanitize, err := utils.NormalizePhone(phone, countryCode)
	if err != nil {
		return models.User{}, nil
	} else {
		lookupValue = sanitize
	}

	if isEmail {
		lookupField = "email = ?"
		lookupValue = email
	}

	fmt.Print("Lookup Value : ", lookupValue)

	if err := s.DB.First(&user, lookupField, lookupValue).Error; err != nil {
		return models.User{}, err
	}
	fmt.Print("user : ", user)

	// check verifikasi
	errVal := errors.New("anda tidak dapat mendaftarkan akun tanpa validasi OTP")
	if isEmail {
		if user.EmailVerifiedAt == nil {
			return models.User{}, errVal
		}
	} else {
		if user.PhoneVerifiedAt == nil {
			return models.User{}, errVal
		}
	}

	// build updates
	updates := map[string]interface{}{
		"name":     name,
		"username": username,
	}

	if email != "" {
		var existing models.User
		if err := connection.DB.Where("email = ? AND id <> ?", email, user.ID).First(&existing).Error; err == nil {
			return models.User{}, fmt.Errorf("email sudah digunakan oleh user lain")
		}
	}

	if phone != "" {
		var existing models.User
		if err := connection.DB.Where("phone = ? AND id <> ?", sanitize, user.ID).First(&existing).Error; err == nil {
			return models.User{}, fmt.Errorf("nomor telepon sudah digunakan oleh user lain")
		}
	}

	if email != "" {
		updates["email"] = email
	}

	if phone != "" {
		updates["phone"] = sanitize
	}

	// simpan perubahan
	if err := s.DB.Model(&user).Updates(updates).Error; err != nil {
		return models.User{}, err
	}

	connection.DeleteKeysByPattern(context.Background(), "users:*")

	return user, nil
}

// LOGOUT
func (s *AuthService) Logout(c *fiber.Ctx) error {
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

	// Hapus refresh token dari Redis jika ada userID
	if userID != "" {
		_ = connection.DeleteToken("refresh:" + userID)
	}

	httpOnly := false
	if val := os.Getenv("COOKIE_HTTPONLY"); val != "" {
		httpOnly, _ = strconv.ParseBool(val) // Error diabaikan, default tetap false
	}

	sameSite := "Lax"
	if sameSiteStr := strings.ToLower(os.Getenv("COOKIE_SAMESITE")); sameSiteStr != "" {
		if sameSiteStr == "strict" {
			sameSite = "Strict"
		}
	}

	// Clear dengan expired date yang jauh di masa lalu
	c.Cookie(&fiber.Cookie{
		Name:     "refreshToken",
		Value:    "",
		MaxAge:   -86400,                          // -24 jam
		Expires:  time.Now().Add(-24 * time.Hour), // Tambahan explicit expires
		HTTPOnly: httpOnly,
		Secure:   os.Getenv("APP_ENV") == "production",
		SameSite: sameSite,
		Domain:   os.Getenv("COOKIE_DOMAIN"),
		Path:     "/",
	})

	// Clear juga dengan path alternatif
	c.Cookie(&fiber.Cookie{
		Name:     "refreshToken",
		Value:    "",
		MaxAge:   -86400,
		Expires:  time.Now().Add(-24 * time.Hour),
		HTTPOnly: httpOnly,
		Secure:   os.Getenv("APP_ENV") == "production",
		SameSite: sameSite,
		Domain:   os.Getenv("COOKIE_DOMAIN"),
		Path:     "/api",
	})

	// Clear default method
	c.ClearCookie("refreshToken")

	// Clear dengan expired date yang jauh di masa lalu
	c.Cookie(&fiber.Cookie{
		Name:     "accessToken",
		Value:    "",
		MaxAge:   -86400,                          // -24 jam
		Expires:  time.Now().Add(-24 * time.Hour), // Tambahan explicit expires
		HTTPOnly: httpOnly,
		Secure:   os.Getenv("APP_ENV") == "production",
		SameSite: sameSite,
		Domain:   os.Getenv("COOKIE_DOMAIN"),
		Path:     "/",
	})

	// Clear juga dengan path alternatif
	c.Cookie(&fiber.Cookie{
		Name:     "accessToken",
		Value:    "",
		MaxAge:   -86400,
		Expires:  time.Now().Add(-24 * time.Hour),
		HTTPOnly: httpOnly,
		Secure:   os.Getenv("APP_ENV") == "production",
		SameSite: sameSite,
		Domain:   os.Getenv("COOKIE_DOMAIN"),
		Path:     "/api",
	})

	// Clear default method
	c.ClearCookie("accessToken")

	return nil
}

// Check User Exist
func (s *AuthService) CheckUserExist(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return fmt.Errorf("ID yang diberikan tidak valid")
	}
	var user models.User
	if err := s.DB.Select("ID").First(&user, "id = ?", id).Error; err != nil {
		return fmt.Errorf("Gagal Mendapatkan user")
	}
	return nil
}

//-------------------------------------------
//------------- Token Issue -----------------
//-------------------------------------------

func (s *AuthService) CheckAccessToken(c *fiber.Ctx) (fiber.Map, error) {
	authHeader := c.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		return nil, errors.New("token tidak ditemukan atau tidak valid")
	}

	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("APP_SECRET")), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("token tidak valid")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("claim token tidak valid")
	}

	if claims["type"] != "access" {
		return nil, errors.New("token bukan access token")
	}

	// ✅ Simpan langsung ke Locals — biarkan middleware ACL yang handle
	if claims["permissions"] != nil {
		c.Locals("permissions", claims["permissions"])
	} else {
		c.Locals("permissions", []string{})
	}

	c.Locals("user_id", claims["user_id"])
	c.Locals("user", token)

	// ✅ Return data untuk keperluan debugging/frontend jika perlu
	return fiber.Map{
		"user_id":     claims["user_id"],
		"permissions": claims["permissions"], // return as-is
	}, nil
}

// REFRESH TOKEN
func (s *AuthService) RefreshToken(c *fiber.Ctx) (fiber.Map, error) {
	// Ambil refresh token dari cookie
	fmt.Println("🍪 All cookies:", c.Cookies(""))
	fmt.Println("🌐 Origin:", c.Get("Origin"))
	fmt.Println("📡 Referer:", c.Get("Referer"))

	refreshToken := c.Cookies("refreshToken")
	if refreshToken == "" {
		fmt.Println("❌ No refresh token in cookie")
		return nil, errors.New("refresh token tidak ditemukan")
	}

	fmt.Printf("DEBUG: Refresh token found: %s\n", refreshToken) // Log partial token

	token, err := jwt.Parse(refreshToken, func(token *jwt.Token) (any, error) {
		return []byte(os.Getenv("APP_SECRET")), nil
	})

	if err != nil || !token.Valid {
		fmt.Printf("DEBUG: Invalid token: %v\n", err)
		c.ClearCookie("refreshToken")
		return nil, errors.New("token tidak valid")
	}

	claims := token.Claims.(jwt.MapClaims)
	if claims["type"] != "refresh" {
		fmt.Println("DEBUG: Token is not refresh type")
		c.ClearCookie("refreshToken")
		return nil, errors.New("token bukan refresh token")
	}

	userID := claims["user_id"].(string)
	fmt.Printf("DEBUG: Checking token for user: %s\n", userID)

	// Validasi dengan token yang tersimpan di Redis
	savedToken, err := connection.GetToken("refresh:" + userID)
	if err != nil {
		fmt.Printf("DEBUG: Token not found in Redis: %v\n", err)
		c.ClearCookie("refreshToken")
		return nil, err
	}

	if savedToken != refreshToken {
		fmt.Printf("DEBUG: Token mismatch with saved token : %s", savedToken)
		c.ClearCookie("refreshToken")
		return nil, errors.New("refresh token tidak cocok")
	}

	fmt.Println("DEBUG: Token validation successful, generating new tokens")

	// Get fresh permissions for the user
	permissions, err := s.GetUserPermissions(userID)
	if err != nil {
		return nil, err
	}

	// Generate access token baru dengan permissions terbaru
	newAccessToken, _ := generateTokenWithPermissions(userID, "access", time.Hour, permissions)

	return fiber.Map{
		"access_token":  newAccessToken,
		"refresh_token": refreshToken,
		"user_id":       userID,
		"permissions":   permissions,
	}, nil
}

// Check Registered User
func (s *AuthService) CheckRegistered(phone string, email string) (models.User, error) {
	var user models.User
	if err := s.DB.First(&user, "phone = ? OR email = ?", phone, email).Error; err != nil {
		return models.User{}, nil
	}
	return user, nil
}
