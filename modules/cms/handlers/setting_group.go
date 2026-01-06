package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SettingGroupInput struct {
	Name        string  `json:"name" validate:"required"`
	Description *string `json:"description,omitempty" validate:"omitempty"`
	Icon        *string `json:"icon,omitempty" validate:"omitempty"`
}

type SettingGroupHandler struct {
	DB *gorm.DB
}

func NewSettingGroupHandler(db *gorm.DB) *SettingGroupHandler {
	return &SettingGroupHandler{DB: db}
}

// GetAllSettingGroups returns all groups with their settings
func (h *SettingGroupHandler) GetAllSettingGroups(c *fiber.Ctx) error {
	var groups []models.SettingGroup
	if err := h.DB.Preload("Settings").Find(&groups).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data SettingGroups", nil)
	}
	return utils.RespApi(c, "ok", "Berhasil mendapatkan data SettingGroups", groups)
}

// GetSettingGroup returns a single group with its settings
func (h *SettingGroupHandler) GetSettingGroup(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	var group models.SettingGroup
	if err := h.DB.First(&group, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.RespApi(c, "not_found", "SettingGroup tidak ditemukan", nil)
		}
		return utils.RespApi(c, "ise", "Gagal mendapatkan data SettingGroup", err.Error())
	}

	// Ambil settings yang terkait
	var settings []models.Setting
	if err := h.DB.Where("group_id = ?", group.ID).Find(&settings).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan settings terkait", err.Error())
	}

	response := map[string]interface{}{
		"id":          group.ID,
		"name":        group.Name,
		"description": group.Description,
		"icon":        group.Icon,
		"settings":    settings,
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data SettingGroup", response)
}

// CreateSettingGroup creates a new setting group
func (h *SettingGroupHandler) CreateSettingGroup(c *fiber.Ctx) error {
	var input SettingGroupInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request body tidak valid", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	group := models.SettingGroup{
		Name:        input.Name,
		Description: input.Description,
		Icon:        input.Icon,
	}

	if err := h.DB.Create(&group).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal membuat SettingGroup", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil membuat SettingGroup", group)
}

// UpdateSettingGroup updates an existing setting group
func (h *SettingGroupHandler) UpdateSettingGroup(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	var input SettingGroupInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request body tidak valid", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	var group models.SettingGroup
	if err := h.DB.First(&group, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.RespApi(c, "not_found", "SettingGroup tidak ditemukan", nil)
		}
		return utils.RespApi(c, "ise", "Gagal mendapatkan data SettingGroup", err.Error())
	}

	updates := map[string]interface{}{
		"name":        input.Name,
		"description": input.Description,
		"icon":        input.Icon,
	}

	if err := h.DB.Model(&group).Updates(updates).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal memperbarui SettingGroup", err.Error())
	}

	// Ambil data terbaru
	if err := h.DB.First(&group, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data terbaru", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil memperbarui SettingGroup", group)
}

// DeleteSettingGroup deletes a setting group only if no settings are using it
func (h *SettingGroupHandler) DeleteSettingGroup(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	var group models.SettingGroup
	if err := h.DB.First(&group, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.RespApi(c, "not_found", "SettingGroup tidak ditemukan", nil)
		}
		return utils.RespApi(c, "ise", "Gagal mendapatkan data SettingGroup", err.Error())
	}

	// Cek apakah masih ada settings yang menggunakan GroupKey ini
	var settingCount int64
	h.DB.Model(&models.Setting{}).Where("group_id = ?", group.ID).Count(&settingCount)
	if settingCount > 0 {
		return utils.RespApi(c, "bad", "Tidak dapat menghapus: masih ada settings yang menggunakan group ini", nil)
	}

	if err := h.DB.Delete(&group).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menghapus SettingGroup", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil menghapus SettingGroup", nil)
}
