package handlers

import (
	"aldev/modules/auth/services"
	"aldev/utils"
	"errors"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type AuthHandler struct {
	Service *services.AuthService
}

func NewAuthHandler(service *services.AuthService) *AuthHandler {
	return &AuthHandler{Service: service}
}

// -------------------------------------------------------------
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var input struct {
		Login   string `json:"login" validate:"required"`
		Code    string `json:"code" validate:"required"`
		Purpose string `json:"purpose" validate:"oneof=register changes verify login"`
	}
	if err := c.BodyParser(&input); err != nil {
		return utils.SecureRespApi(c, "bad", "Input tidak valid", err.Error(), true)
	}

	accessToken, refreshToken, user, permissions, err := h.Service.Login(input.Login, input.Code, input.Purpose)
	if err != nil {
		return utils.SecureRespApi(c, "perm", "Login gagal", err.Error(), true)
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

	accessAge := 15
	if ageStr := os.Getenv("COOKIE_ACCESSAGE"); ageStr != "" {
		if age, err := strconv.Atoi(ageStr); err == nil {
			accessAge = age
		}
	}

	refreshAge := 7
	if ageStr := os.Getenv("COOKIE_REFRESHAGE"); ageStr != "" {
		if age, err := strconv.Atoi(ageStr); err == nil {
			refreshAge = age
		}
	}

	c.Cookie(&fiber.Cookie{
		Name:     "accessToken",
		Value:    accessToken,
		MaxAge:   int((time.Minute * time.Duration(accessAge)).Seconds()), // sesuaikan masa berlaku
		HTTPOnly: httpOnly,
		Secure:   os.Getenv("APP_ENV") == "production",
		Domain:   os.Getenv("COOKIE_DOMAIN"),
		SameSite: sameSite,
		Path:     "/",
	})

	c.Cookie(&fiber.Cookie{
		Name:     "refreshToken",
		Value:    refreshToken,
		MaxAge:   int((time.Hour * 24 * time.Duration(refreshAge)).Seconds()),
		HTTPOnly: httpOnly,
		Secure:   os.Getenv("APP_ENV") == "production",
		Domain:   os.Getenv("COOKIE_DOMAIN"),
		SameSite: sameSite,
		Path:     "/",
	})

	// Respons tetap kirim data user (untuk client jika perlu)
	return utils.SecureRespApi(c, "ok", "Login berhasil", fiber.Map{
		"user":        user,
		"permissions": permissions,
		// accessToken TIDAK dikirim di body → lebih aman
	}, true)
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	input := struct {
		Phone       string `json:"phone" validate:"required_without=Email,omitempty,min=6,max=15"`
		Name        string `json:"name" validate:"required"`
		CountryCode string `json:"country_code" validate:"required"`
		Username    string `json:"username" validate:"required"`
		Email       string `json:"email" validate:"required_without=Phone,omitempty,email,min=6"`
		IsEmail     bool   `json:"is_email"`
	}{}

	if err := c.BodyParser(&input); err != nil {
		return utils.SecureRespApi(c, "bad", "Invalid input", err.Error(), true)
	}

	if err := utils.Validate.Struct(input); err != nil {
		return utils.SecureRespApi(c, "bad", "Validasi gagal", err.Error(), true)
	}

	user, err := h.Service.Register(input.Phone, input.CountryCode, input.Name, input.Username, input.Email, input.IsEmail)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return utils.SecureRespApi(c, "empty", "Data tidak ditemukan", nil, true)
		}
		return utils.SecureRespApi(c, "ise", "Gagal registrasi akun", err.Error(), true)
	}

	return utils.SecureRespApi(c, "ok", "Register berhasil", user, true)
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	if err := h.Service.Logout(c); err != nil {
		return utils.SecureRespApi(c, "ise", "Ada kesalahan saat Logout", err.Error(), true)
	}

	return utils.SecureRespApi(c, "ok", "Logout berhasil", nil, true)
}

// -------------------------------------------------------------
func (h *AuthHandler) CheckAccessToken(c *fiber.Ctx) error {
	fmap, err := h.Service.CheckAccessToken(c)
	if err != nil {
		return utils.SecureRespApi(c, "ise", "Terdapat kesalahan saat cek akses token", err.Error(), true)
	}
	return utils.SecureRespApi(c, "ok", "Token Valid", fmap, true)
}

// REFRESH TOKEN - Updated to regenerate permissions
func (h *AuthHandler) RefreshToken(c *fiber.Ctx) error {
	fmap, err := h.Service.RefreshToken(c)
	if err != nil {
		return utils.SecureRespApi(c, "ise", "Terdapat kesalahan saat cek refresh token", err.Error(), true)
	}

	// Ambil accessToken baru dari respons service
	accessToken, ok := fmap["access_token"].(string)
	if !ok {
		return utils.SecureRespApi(c, "ise", "Access token tidak valid", nil, true)
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

	accessAge := 15
	if ageStr := os.Getenv("COOKIE_ACCESSAGE"); ageStr != "" {
		if age, err := strconv.Atoi(ageStr); err == nil {
			accessAge = age
		}
	}

	c.Cookie(&fiber.Cookie{
		Name:     "accessToken",
		Value:    accessToken,
		MaxAge:   int((time.Minute * time.Duration(accessAge)).Seconds()), // sesuaikan masa berlaku
		HTTPOnly: httpOnly,
		Secure:   os.Getenv("APP_ENV") == "production",
		Domain:   os.Getenv("COOKIE_DOMAIN"),
		SameSite: sameSite,
		Path:     "/",
	})

	// Kirim hanya data yang perlu ke client
	return utils.SecureRespApi(c, "ok", "Berhasil memperbarui token", fiber.Map{
		"user":         fmap["user"],
		"access_token": accessToken,
		"permissions":  fmap["permissions"],
	}, true)
}

// Check user ada atau tidak berdasarkan id
func (h *AuthHandler) CheckUserExist(c *fiber.Ctx) error {
	if err := h.Service.CheckUserExist(c); err != nil {
		return utils.SecureRespApi(c, "ise", err.Error(), nil, true)
	}

	return utils.SecureRespApi(c, "ok", "User ditemukan!", nil, true)
}

// Check Registered User
func (h *AuthHandler) CheckRegistered(c *fiber.Ctx) error {
	var input struct {
		Phone string `validate:"omitempty,min=6,max=14"`
		Email string `validate:"omitempty,email"`
	}

	if err := c.BodyParser(&input); err != nil {
		return utils.SecureRespApi(c, "bad", "Request Body tidak valid", err.Error(), true)
	}

	if input.Phone == "" && input.Email == "" {
		return utils.SecureRespApi(c, "bad", "Harus ada salah satu antara Email atau Phone", nil, true)
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.SecureRespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator), true)
		}
		return utils.SecureRespApi(c, "bad", "Validasi gagal", err.Error(), true)
	}

	user, err := h.Service.CheckRegistered(input.Phone, input.Email)
	if err != nil {
		return utils.SecureRespApi(c, "ise", "Ada kesalahan saat check registrasi", err.Error(), true)
	}

	return utils.SecureRespApi(c, "ok", "User Terdaftar di Database", user, true)
}
