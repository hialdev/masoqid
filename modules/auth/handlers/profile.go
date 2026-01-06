package handlers

import (
	"aldev/connection"
	"aldev/modules/auth/models"
	"aldev/utils"
	"errors"
	"os"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProfileUpdateBasicInput struct {
	Name     *string `json:"name" validate:"required,min=2,max=20"`
	Username *string `json:"username" validate:"required,min=4,max=12"`
	Image    *string `json:"image"`
}

type ProfileUpdateEmailInput struct {
	Email string `json:"email" validate:"email,omitempty,min=6"`
	Code  string `json:"code" validate:"required,min=6,max=6"`
}

type ProfileUpdatePhoneInput struct {
	Phone string `json:"phone" validate:"required,min=10,max=15"`
	Code  string `json:"code" validate:"required,min=6,max=6"`
}

type ProfileHandler struct {
	DB *gorm.DB
}

func NewProfileHandler(db *gorm.DB) *ProfileHandler {
	return &ProfileHandler{DB: db}
}

func (h *ProfileHandler) Get(c *fiber.Ctx) error {
	var userID string

	// Ambil user ID dari access token jika ada
	userJWT := c.Locals("user")
	if userJWT != nil {
		token := userJWT.(*jwt.Token)
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

	// -----------------------

	id, err := uuid.Parse(userID)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	var profile models.User
	if err := h.DB.Preload("Role.Permissions").First(&profile, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return utils.RespApi(c, "empty", "User tidak ditemukan", nil)
		}
	}
	return utils.RespApi(c, "ok", "Berhasil mengambil data profile", profile)
}

func (h *ProfileHandler) UpdateBasic(c *fiber.Ctx) error {
	
	// Input Struct dan Validasi
	var input ProfileUpdateBasicInput

	contentType := c.Get("Content-Type")
	if strings.Contains(contentType, "multipart/form-data") {
		nameVal := c.FormValue("name")
		input.Name = &nameVal
		usernameVal := c.FormValue("username")
		input.Username = &usernameVal
	} else {
		if err := c.BodyParser(&input); err != nil {
			return utils.RespApi(c, "bad", "Invalid input", err.Error())
		}
	}
	
	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	// -----------------------

	var userID string

	// Ambil user ID dari access token jika ada
	userJWT := c.Locals("user")
	if userJWT != nil {
		token := userJWT.(*jwt.Token)
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

	// -----------------------

	id, err := uuid.Parse(userID)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	var user models.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "User tidak ditemukan", err.Error())
	}

	// Map untuk menyimpan perubahan
	updUser := make(map[string]interface{})

	// --- Update Name ---
	if *input.Name != "" && (user.Name == nil || *input.Name != *user.Name) {
		updUser["name"] = input.Name
	}

	// --- Update Username ---
	if *input.Username != "" && (user.Username == nil || *input.Username != *user.Username) {
		var count int64
		h.DB.Model(&models.User{}).Where("username = ? AND id != ?", input.Username, id).Count(&count)
		if count > 0 {
			return utils.RespApi(c, "bad", "Username sudah digunakan", nil)
		}
		updUser["username"] = input.Username
	}

	// --- Upload Image ---
	oldImage := user.Image
	if file, err := c.FormFile("image"); err == nil && file != nil {
		var oldImagePath string
		if oldImage != nil {
			oldImagePath = *oldImage
		}

		filePath, err := utils.UpdateFile(c, oldImagePath, "image", "users")
		if err != nil {
			return utils.RespApi(c, "bad", "Gagal memperbarui image User", err.Error())
		}

		updUser["image"] = filePath

		if oldImage != nil && *oldImage != "" {
			go utils.DeleteFile(*oldImage) // async delete
		}
	}

	// --- Lakukan Update Hanya Jika Ada Perubahan ---
	if len(updUser) > 0 {
		if err := h.DB.Model(&user).Updates(updUser).Error; err != nil {
			return utils.RespApi(c, "ise", "Gagal Memperbarui User", err.Error())
		}
	}

	// --- Reload User ---
	var updatedUser models.User
	if err := h.DB.Preload("Role").First(&updatedUser, id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mengambil data user setelah update", err.Error())
	}

	userName := "User"
	if updatedUser.Name != nil {
		userName = *updatedUser.Name
	}
	connection.DeleteKeysByPattern(c.Context(), "users:*")

	return utils.RespApi(c, "ok", userName+" berhasil diperbarui", updatedUser)
}

func (h *ProfileHandler) UpdateEmail(c *fiber.Ctx) error {
	// Input Struct dan Validasi
	var input ProfileUpdateEmailInput

	contentType := c.Get("Content-Type")
	if strings.Contains(contentType, "multipart/form-data") {
		input.Email = c.FormValue("email")
	} else {
		if err := c.BodyParser(&input); err != nil {
			return utils.RespApi(c, "bad", "Invalid input", err.Error())
		}
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	// -----------------------

	var userID string

	// Ambil user ID dari access token jika ada
	userJWT := c.Locals("user")
	if userJWT != nil {
		token := userJWT.(*jwt.Token)
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

	// -----------------------

	var user models.User

	id, err := uuid.Parse(userID)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "User tidak ditemukan", err.Error())
	}

	// Validasi OTP
	if err := h.checkCodeOTP(input.Code, input.Email, ""); err != nil {
		return utils.RespApi(c, "bad", "Kode OTP tidak valid", err.Error())
	}

	// Map untuk menyimpan perubahan
	updUser := make(map[string]interface{})

	// --- Update Email ---
	if input.Email != "" && (user.Email == nil || input.Email != *user.Email) {
		var count int64
		h.DB.Model(&models.User{}).Where("email = ? AND id != ?", input.Email, id).Count(&count)
		if count > 0 {
			return utils.RespApi(c, "bad", "Email sudah digunakan oleh user lain", nil)
		}
		updUser["email"] = input.Email
	}

	// --- Lakukan Update Hanya Jika Ada Perubahan ---
	if len(updUser) > 0 {
		if err := h.DB.Model(&user).Updates(updUser).Error; err != nil {
			return utils.RespApi(c, "ise", "Gagal Memperbarui User", err.Error())
		}
	}

	// --- Reload User ---
	var updatedUser models.User
	if err := h.DB.Preload("Role").First(&updatedUser, id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mengambil data user setelah update", err.Error())
	}

	userName := "User"
	if updatedUser.Name != nil {
		userName = *updatedUser.Name
	}
	connection.DeleteKeysByPattern(c.Context(), "users:*")

	return utils.RespApi(c, "ok", userName+" berhasil diperbarui", updatedUser)
}

func (h *ProfileHandler) UpdatePhone(c *fiber.Ctx) error {
	// Input Struct dan Validasi
	var input ProfileUpdatePhoneInput

	contentType := c.Get("Content-Type")
	if strings.Contains(contentType, "multipart/form-data") {
		input.Phone = c.FormValue("phone")
	} else {
		if err := c.BodyParser(&input); err != nil {
			return utils.RespApi(c, "bad", "Invalid input", err.Error())
		}
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	// -----------------------

	var userID string

	// Ambil user ID dari access token jika ada
	userJWT := c.Locals("user")
	if userJWT != nil {
		token := userJWT.(*jwt.Token)
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

	// -----------------------

	var user models.User

	id, err := uuid.Parse(userID)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "User tidak ditemukan", err.Error())
	}

	// Validasi OTP
	if err := h.checkCodeOTP(input.Code, "", input.Phone); err != nil {
		return utils.RespApi(c, "bad", "Kode OTP tidak valid", err.Error())
	}

	// Map untuk menyimpan perubahan
	updUser := make(map[string]interface{})

	// --- Update Phone ---
	if input.Phone != "" && (user.Phone == nil || input.Phone != *user.Phone) {
		var count int64
		h.DB.Model(&models.User{}).Where("phone = ? AND id != ?", input.Phone, id).Count(&count)
		if count > 0 {
			return utils.RespApi(c, "bad", "Phone sudah digunakan oleh user lain", nil)
		}
		updUser["phone"] = input.Phone
	}

	// --- Lakukan Update Hanya Jika Ada Perubahan ---
	if len(updUser) > 0 {
		if err := h.DB.Model(&user).Updates(updUser).Error; err != nil {
			return utils.RespApi(c, "ise", "Gagal Memperbarui User", err.Error())
		}
	}

	// --- Reload User ---
	var updatedUser models.User
	if err := h.DB.Preload("Role").First(&updatedUser, id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mengambil data user setelah update", err.Error())
	}

	userName := "User"
	if updatedUser.Name != nil {
		userName = *updatedUser.Name
	}
	connection.DeleteKeysByPattern(c.Context(), "users:*")

	return utils.RespApi(c, "ok", userName+" berhasil diperbarui", updatedUser)
}

// ---------------------------------------------
func (h *ProfileHandler) checkCodeOTP(code, email, phone string) error {
	var otp models.Otp
	var lookupField string
	var lookupValue string

	if code == "" {
		return errors.New("kode OTP harus diisi")
	}

	if email == "" && phone == "" {
		return errors.New("email atau phone harus diisi")
	}

	if email != "" {
		lookupField = "email"
		lookupValue = email
	} else {
		lookupField = "phone"
		lookupValue = phone
	}

	if err := h.DB.
		Where("LOWER(code) = ?", strings.ToLower(code)).
		Where("purpose = ?", "changes").
		Where(lookupField+" = ?", lookupValue).
		First(&otp).Error; err != nil {
		return err
	}

	loc, _ := time.LoadLocation(os.Getenv("APP_TIMEZONE"))
	now := time.Now().In(loc)

	if otp.ExpiredAt.Before(now) {
		return errors.New("kode OTP sudah kedaluwarsa")
	}

	// berhasil tervalidasi maka hapus OTP
	if err := h.DB.Delete(&otp).Error; err != nil {
		return err
	}

	return nil
}
