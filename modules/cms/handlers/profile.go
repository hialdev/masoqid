package handlers

import (
	authModels "aldev/modules/auth/models"
	cmsModels "aldev/modules/cms/models"
	"aldev/utils"
	"strconv"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProfileInput struct {
	UserID    string  `json:"user_id" validate:"required,uuid"`
	NIK       string  `json:"nik" validate:"required"`
	NIP       *string `json:"nip,omitempty"`
	NPWP      *string `json:"npwp,omitempty"`
	Address   string  `json:"address" validate:"required"`
	OfficeID  *string `json:"office_id,omitempty"`
	CompanyID *string `json:"company_id,omitempty"`
}

type ProfileHandler struct {
	DB *gorm.DB
}

func NewProfileHandler(db *gorm.DB) *ProfileHandler {
	return &ProfileHandler{DB: db}
}

// GetAllProfiles - GET /api/profiles
func (h *ProfileHandler) GetAllProfiles(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	search := strings.ToLower(c.Query("search", ""))
	officeFilter := c.Query("office_id", "")
	companyFilter := c.Query("company_id", "")
	offset := (page - 1) * limit

	query := h.DB.Model(&cmsModels.Profile{}).
		Preload("User.Role").
		Preload("Office").
		Preload("Company")

	// Filter by company_id if user is Company Owner
	userIDStr, ok := c.Locals("user_id").(string)
	if ok && userIDStr != "" {
		var currentUser authModels.User
		if err := h.DB.Preload("Role").First(&currentUser, "id = ?", userIDStr).Error; err == nil {
			isManager := currentUser.Role.Name == "Company Owner" || currentUser.Role.Name == "Office Manager"
			if currentUser.RoleID != nil && isManager && currentUser.CompanyID != nil {
				query = query.Where("profiles.company_id = ?", currentUser.CompanyID)
			}
		}
	}

	if search != "" {
		query = query.Joins("JOIN users ON users.id = profiles.user_id").
			Where("LOWER(users.name) LIKE ? OR LOWER(profiles.nik) LIKE ?",
				"%"+search+"%", "%"+search+"%")
	}

	if officeFilter != "" {
		query = query.Where("profiles.office_id = ?", officeFilter)
	}

	if companyFilter != "" {
		query = query.Where("profiles.company_id = ?", companyFilter)
	}

	var total int64
	query.Count(&total)

	var profiles []cmsModels.Profile
	if err := query.Offset(offset).Limit(limit).Order("profiles.created_at DESC").Find(&profiles).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data profiles", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data profiles", fiber.Map{
		"data":  profiles,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetProfile - GET /api/profiles/:id
func (h *ProfileHandler) GetProfile(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID tidak valid", nil)
	}

	var profile cmsModels.Profile
	if err := h.DB.Preload("User.Role").Preload("Office").Preload("Company").
		First(&profile, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "Profile tidak ditemukan", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan profile", profile)
}

// GetMyProfile - GET /api/my-profile (JWT only — karyawan lihat profile sendiri)
func (h *ProfileHandler) GetMyProfile(c *fiber.Ctx) error {
	userIDStr, ok := c.Locals("user_id").(string)
	if !ok {
		return utils.RespApi(c, "perm", "User tidak terautentikasi", nil)
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return utils.RespApi(c, "bad", "User ID tidak valid", nil)
	}

	var profile cmsModels.Profile
	if err := h.DB.Preload("User.Role").Preload("Office.Company").Preload("Company").
		First(&profile, "user_id = ?", userID).Error; err != nil {
		return utils.RespApi(c, "empty", "Profile belum dibuat", nil)
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan profile saya", profile)
}

// CreateProfile - POST /api/profiles
func (h *ProfileHandler) CreateProfile(c *fiber.Ctx) error {
	var input ProfileInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	// Pastikan user ada
	userID, _ := uuid.Parse(input.UserID)
	var user authModels.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		return utils.RespApi(c, "bad", "User tidak ditemukan", nil)
	}

	// Cek sudah ada profile untuk user ini
	var existing cmsModels.Profile
	if err := h.DB.Where("user_id = ?", userID).First(&existing).Error; err == nil {
		return utils.RespApi(c, "bad", "Profile untuk user ini sudah ada", nil)
	}

	profile := cmsModels.Profile{
		UserID:  userID,
		NIK:     input.NIK,
		NIP:     input.NIP,
		NPWP:    input.NPWP,
		Address: input.Address,
	}

	if input.OfficeID != nil && *input.OfficeID != "" {
		officeUUID, err := uuid.Parse(*input.OfficeID)
		if err == nil {
			profile.OfficeID = &officeUUID
		}
	}

	if input.CompanyID != nil && *input.CompanyID != "" {
		companyUUID, err := uuid.Parse(*input.CompanyID)
		if err == nil {
			profile.CompanyID = &companyUUID
		}
	}

	if err := h.DB.Create(&profile).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal membuat profile", err.Error())
	}

	// --- Sync office_id and company_id to User table
	h.DB.Model(&authModels.User{}).Where("id = ?", profile.UserID).Updates(map[string]interface{}{
		"office_id":  profile.OfficeID,
		"company_id": profile.CompanyID,
	})

	h.DB.Preload("User.Role").Preload("Office").Preload("Company").First(&profile, "id = ?", profile.ID)
	return utils.RespApi(c, "ok", "Profile berhasil dibuat", profile)
}

// UpdateProfile - PATCH /api/profiles/:id
func (h *ProfileHandler) UpdateProfile(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID tidak valid", nil)
	}

	var profile cmsModels.Profile
	if err := h.DB.First(&profile, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "Profile tidak ditemukan", nil)
	}

	var input struct {
		NIK       *string `json:"nik"`
		NIP       *string `json:"nip"`
		NPWP      *string `json:"npwp"`
		Address   *string `json:"address"`
		OfficeID  *string `json:"office_id"`
		CompanyID *string `json:"company_id"`
	}

	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
	}

	updates := map[string]interface{}{}
	if input.NIK != nil {
		updates["nik"] = *input.NIK
	}
	if input.NIP != nil {
		updates["nip"] = *input.NIP
	}
	if input.NPWP != nil {
		updates["npwp"] = *input.NPWP
	}
	if input.Address != nil {
		updates["address"] = *input.Address
	}
	if input.OfficeID != nil {
		if *input.OfficeID == "" {
			updates["office_id"] = nil
		} else if officeUUID, err := uuid.Parse(*input.OfficeID); err == nil {
			updates["office_id"] = officeUUID
		}
	}
	if input.CompanyID != nil {
		if *input.CompanyID == "" {
			updates["company_id"] = nil
		} else if companyUUID, err := uuid.Parse(*input.CompanyID); err == nil {
			updates["company_id"] = companyUUID
		}
	}

	if len(updates) > 0 {
		if err := h.DB.Model(&profile).Updates(updates).Error; err != nil {
			return utils.RespApi(c, "ise", "Gagal memperbarui profile", err.Error())
		}
	}

	h.DB.Preload("User.Role").Preload("Office").Preload("Company").First(&profile, "id = ?", id)
	return utils.RespApi(c, "ok", "Profile berhasil diperbarui", profile)
}

// DeleteProfile - DELETE /api/profiles/:id
func (h *ProfileHandler) DeleteProfile(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID tidak valid", nil)
	}

	var profile cmsModels.Profile
	if err := h.DB.First(&profile, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "Profile tidak ditemukan", nil)
	}

	if err := h.DB.Delete(&profile).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menghapus profile", err.Error())
	}

	return utils.RespApi(c, "ok", "Profile berhasil dihapus", nil)
}
