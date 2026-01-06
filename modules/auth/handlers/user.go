package handlers

import (
	"aldev/connection"
	"aldev/modules/auth/models"
	"aldev/utils"
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserInitialInput struct {
	Phone       string  `json:"phone" validate:"omitempty,min=6,max=16"`
	Name        string  `json:"name" validate:"required"`
	CountryCode string  `json:"country_code" validate:"omitempty"`
	Username    string  `json:"username" validate:"required"`
	Email       string  `json:"email" validate:"omitempty,email,min=6"`
	Image       *string `json:"image"`
	RoleID      *string `json:"role_id,omitempty" validate:"omitempty"`
}

type UserUpdateInput struct {
	Phone       string  `json:"phone" validate:"omitempty,min=6,max=16"`
	Name        string  `json:"name" validate:"required"`
	CountryCode string  `json:"country_code" validate:"omitempty"`
	Username    string  `json:"username" validate:"required"`
	Email       string  `json:"email" validate:"omitempty,email,min=6"`
	Image       *string `json:"image"`
	RoleID      *string `json:"role_id,omitempty" validate:"omitempty"`
}

type UserHandler struct {
	DB *gorm.DB
}

func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{DB: db}
}

func (r *UserHandler) generateCacheKey(page, limit int, search, sort, order string) string {
	return fmt.Sprintf(
		"users:page:%d:limit:%d:search:%s:sort:%s:order:%s",
		page, limit,
		url.QueryEscape(strings.ToLower(search)),
		sort, order,
	)
}

func checkEmailOrPhoneExist(email, phone string) (string, error) {
	if email != "" || phone != "" {
		if email != "" {
			return "email", nil
		} else {
			return "phone", nil
		}
	} else {
		return "", fmt.Errorf("email atau Phone wajib diisi")
	}
}

func (r *UserHandler) GetUsers(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	search := strings.ToLower(c.Query("search", ""))
	sort := c.Query("sort", "id")
	order := c.Query("order", "asc")
	roleParam := c.Query("role", "")

	offset := (page - 1) * limit

	db := r.DB.Model(&models.User{}).Preload("Role")

	// --- Filter by role name
	if roleParam != "" {
		roleList := strings.Split(roleParam, ",")
		db = db.Joins("JOIN roles ON roles.id = users.role_id").
			Where("roles.name IN ?", roleList)
	}

	// --- Filter search
	if search != "" {
		db = db.Where(`
			LOWER(users.name) LIKE ? OR 
			LOWER(users.email) LIKE ? OR 
			LOWER(users.username) LIKE ? OR 
			LOWER(CAST(users.phone AS TEXT)) LIKE ?`,
			"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%",
		)
	}

	// --- Hitung total
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal hitung total", err.Error())
	}

	// --- Sorting (whitelisted)
	validSortFields := map[string]string{
		"id":       "users.id",
		"name":     "users.name",
		"username": "users.username",
		"email":    "users.email",
		"phone":    "users.phone",
	}
	sortBy, ok := validSortFields[sort]
	if !ok {
		sortBy = "users.id"
	}
	db = db.Order(fmt.Sprintf("%s %s", sortBy, order))

	// --- Ambil data
	var users []models.User
	if err := db.Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal ambil data", err.Error())
	}

	totalPages := (total + int64(limit) - 1) / int64(limit)

	result := fiber.Map{
		"users": users,
		"pagination": fiber.Map{
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": totalPages,
		},
	}

	return utils.RespApi(c, "ok", "Berhasil ambil data users", result)
}

func (r *UserHandler) GetUser(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "UUID tidak valid", idStr)
	}

	var user models.User
	if err := r.DB.Preload("Role").First(&user, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return utils.RespApi(c, "empty", "Data user tidak ditemukan", err.Error())
		}
		return utils.RespApi(c, "ise", "Kesalahan sistem dalam memproses ", err.Error())
	}
	return utils.RespApi(c, "ok", "Berhasil mendapatkan data user", user)
}

func (h *UserHandler) Create(c *fiber.Ctx) error {
	var input UserInitialInput
	contentType := c.Get("Content-Type")
	if strings.Contains(contentType, "multipart/form-data") {
		// Ambil dari form-data
		roleIDStr := c.FormValue("role_id")
		input.Name = c.FormValue("name")
		input.Username = c.FormValue("username")
		input.Phone = c.FormValue("phone")
		input.Email = c.FormValue("email")
		input.RoleID = &roleIDStr // simpan pointer ke string
	} else {
		// Handle JSON
		if err := c.BodyParser(&input); err != nil {
			return utils.RespApi(c, "bad", "Invalid input", err.Error())
		}
	}

	// Validasi input
	if err := utils.Validate.Struct(input); err != nil {
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}
	fmt.Print("Input", input)

	_, err := checkEmailOrPhoneExist(input.Email, input.Phone)
	if err != nil {
		return utils.RespApi(c, "bad", "Validasi gagal! "+err.Error(), err.Error())
	}

	newUser := models.User{
		Name:     &input.Name,
		Username: &input.Username,
	}

	if input.Phone != "" {
		newUser.Phone = &input.Phone
	}

	if input.Email != "" {
		newUser.Email = &input.Email
	}

	// Handle RoleID jika ada dan tidak kosong
	if input.RoleID != nil && *input.RoleID != "" {
		roleUUID, err := uuid.Parse(*input.RoleID)
		if err != nil {
			return utils.RespApi(c, "bad", "Parsing role uuid gagal", err.Error())
		}
		newUser.RoleID = &roleUUID // assign pointer ke UUID
	}

	// Upload image jika ada
	if file, err := c.FormFile("image"); err == nil && file != nil {
		filePath, err := utils.UploadFile(c, "image", "users")
		if err != nil {
			return utils.RespApi(c, "bad", "Gagal upload image User", err.Error())
		}
		newUser.Image = &filePath
	}

	// Simpan ke database
	if err := h.DB.Create(&newUser).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal Membuat User", err.Error())
	}

	// Reload user dengan relasi atau field generated (opsional)
	// Jika model User punya relasi (e.g. Role), preload di sini
	var user models.User
	if err := h.DB.Preload("Role").First(&user, newUser.ID).Error; err != nil { // sesuaikan dengan relasi-mu
		return utils.RespApi(c, "ise", "Gagal mengambil data user", err.Error())
	}

	connection.DeleteKeysByPattern(c.Context(), "users:*")

	return utils.RespApi(c, "ok", "User berhasil dibuat", user)
}

func (h *UserHandler) Update(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	var user models.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "User tidak ditemukan", err.Error())
	}

	var input UserUpdateInput

	contentType := c.Get("Content-Type")
	if strings.Contains(contentType, "multipart/form-data") {
		roleIDStr := c.FormValue("role_id")
		input.Name = c.FormValue("name")
		input.Username = c.FormValue("username")
		input.Phone = c.FormValue("phone")
		input.Email = c.FormValue("email")
		input.RoleID = &roleIDStr
	} else {
		if err := c.BodyParser(&input); err != nil {
			return utils.RespApi(c, "bad", "Invalid input", err.Error())
		}
	}

	_, err = checkEmailOrPhoneExist(input.Email, input.Phone)
	if err != nil {
		return utils.RespApi(c, "bad", "Validasi gagal! "+err.Error(), err.Error())
	}

	updUser := make(map[string]interface{})

	// --- Update Name ---
	if input.Name != "" && (user.Name == nil || input.Name != *user.Name) {
		updUser["name"] = input.Name
	}

	// --- Update Username ---
	if input.Username != "" && (user.Username == nil || input.Username != *user.Username) {
		var count int64
		h.DB.Model(&models.User{}).Where("username = ? AND id != ?", input.Username, id).Count(&count)
		if count > 0 {
			return utils.RespApi(c, "bad", "Username sudah digunakan", nil)
		}
		updUser["username"] = input.Username
	}

	// --- Update Email ---
	if input.Email != "" && (user.Email == nil || input.Email != *user.Email) {
		var count int64
		h.DB.Model(&models.User{}).Where("email = ? AND id != ?", input.Email, id).Count(&count)
		if count > 0 {
			return utils.RespApi(c, "bad", "Email sudah digunakan oleh user lain", nil)
		}
		updUser["email"] = input.Email
	}

	// --- Update Phone ---
	if input.Phone != "" && (user.Phone == nil || input.Phone != *user.Phone) {
		var count int64
		h.DB.Model(&models.User{}).Where("phone = ? AND id != ?", input.Phone, id).Count(&count)
		if count > 0 {
			return utils.RespApi(c, "bad", "Nomor telepon sudah digunakan oleh user lain", nil)
		}
		updUser["phone"] = input.Phone
	}

	// --- Update RoleID ---
	if input.RoleID != nil && *input.RoleID != "" {
		roleUUID, err := uuid.Parse(*input.RoleID)
		if err != nil {
			return utils.RespApi(c, "bad", "Parsing role uuid gagal", err.Error())
		}
		updUser["role_id"] = roleUUID
	} else if input.RoleID != nil && *input.RoleID == "" {
		var nullUUID *uuid.UUID
		updUser["role_id"] = nullUUID
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

func (h *UserHandler) Delete(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	var user models.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal Mendapatkan user", err.Error())
	}

	if user.Image != nil && *user.Image != "" {
		if err := utils.DeleteFile(*user.Image); err != nil {
			return utils.RespApi(c, "ise", "Gagal Menghapus Image", err.Error())
		}
	}

	if err := h.DB.Delete(&user).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal Menghapus user", err.Error())
	}

	var userName string
	if user.Name != nil {
		userName = *user.Name
	} else {
		userName = ""
	}

	connection.DeleteKeysByPattern(c.Context(), "users:*")

	return utils.RespApi(c, "ok", "User "+userName+" berhasil dihapus", nil)
}

func (h *UserHandler) AssignRole(c *fiber.Ctx) error {
	idStr := c.Params("id")
	var input struct {
		RoleId string `json:"role_id" validate:"required,uuid"`
	}

	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Invalid input", err.Error())
	}

	userId, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "User ID yang diberikan tidak valid", nil)
	}

	roleId, err := uuid.Parse(input.RoleId)
	if err != nil {
		return utils.RespApi(c, "bad", "Role ID yang diberikan tidak valid", nil)
	}

	var user models.User
	if err := h.DB.First(&user, "id = ?", userId).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal Mendapatkan user", err.Error())
	}

	var role models.Role
	if err := h.DB.First(&role, "id = ?", roleId).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal Mendapatkan Role", err.Error())
	}

	if err := h.DB.Model(&user).Update("role_id", roleId).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal Assign Role ke User", err.Error())
	}

	// user.Password = nil

	var userName string
	if user.Name != nil {
		userName = *user.Name
	} else {
		userName = ""
	}

	connection.DeleteKeysByPattern(c.Context(), "users:*")

	return utils.RespApi(c, "ok", "User "+userName+" sekarang memiliiki Role "+role.Name, user)
}
