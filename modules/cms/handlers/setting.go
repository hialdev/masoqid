package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"encoding/json"
	"strconv"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SettingInitialInput struct {
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty" validate:"omitempty"`
	SetKey      string  `json:"set_key" validate:"required"`
	GroupID     uuid.UUID  `json:"group_id" validate:"required"` // <-- sesuai model
	SetType     string  `json:"set_type" validate:"oneof=text number checkbox radio select selects file image files images richtext markdown"`
	SetValue    *string `json:"set_value" validate:"omitempty"`
	SetOptions  *string `json:"set_options" validate:"omitempty"`
	IsUrgent    bool    `json:"is_urgent" validate:"boolean"`
}

type SettingHandler struct {
	DB *gorm.DB
}

func NewSettingHandler(db *gorm.DB) *SettingHandler {
	return &SettingHandler{DB: db}
}

func (h *SettingHandler) GetSettingByKey(c *fiber.Ctx) error {
	keyStr := c.Params("key")

	var setting models.Setting
	if err := h.DB.First(&setting, "set_key = ?", keyStr).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data Setting", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data Setting", setting)
}

func (h *SettingHandler) GetSetting(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Id yang diberikan tidak valid", nil)
	}

	var setting models.Setting
	if err := h.DB.First(&setting, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data Setting", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data Setting", setting)
}

// AddSetting: hanya simpan ke Setting, GroupKey diasumsikan valid
func (h *SettingHandler) AddSetting(c *fiber.Ctx) error {
	var input SettingInitialInput

	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	setting := models.Setting{
		Name:        input.Name,
		Description: input.Description,
		SetKey:      input.SetKey,
		GroupID:     input.GroupID,
		SetType:     input.SetType,
		SetOptions:  input.SetOptions,
		SetValue:    input.SetValue,
		IsUrgent:    input.IsUrgent,
	}

	if err := h.DB.Create(&setting).Error; err != nil {
		return utils.RespApi(c, "ise", "Tidak dapat membuat Setting", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil membuat data Setting", setting)
}

// ValueSetting: tetap sama — hanya update SetValue
func (h *SettingHandler) ValueSetting(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	var setting models.Setting
	if err := h.DB.First(&setting, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal Mendapatkan Setting", err.Error())
	}

	var newValue string
	var filePaths []string

	switch setting.SetType {
	case "text", "richtext", "markdown":
		newValue = c.FormValue("set_value")

	case "number":
		setValue := c.FormValue("set_value")
		if setValue != "" {
			if _, err := strconv.ParseFloat(setValue, 64); err != nil {
				return utils.RespApi(c, "bad", "Nilai harus berupa angka", nil)
			}
		}
		newValue = setValue

	case "checkbox":
		setValue := c.FormValue("set_value")
		boolValue := (setValue == "true" || setValue == "on" || setValue == "1")
		newValue = strconv.FormatBool(boolValue)

	case "radio", "select":
		newValue = c.FormValue("set_value")

	case "selects":
		form, err := c.Request().MultipartForm()
		if err != nil {
			return utils.RespApi(c, "bad", "Gagal membaca form data", err.Error())
		}
		values := form.Value["set_value"]
		if len(values) == 0 {
			newValue = "[]"
		} else {
			valueBytes, _ := json.Marshal(values)
			newValue = string(valueBytes)
		}

	case "file", "image":
		filePath, err := utils.UploadFile(c, "set_value", "settings")
		if err != nil {
			return utils.RespApi(c, "bad", "Gagal upload file", err.Error())
		}
		if setting.SetValue != nil && *setting.SetValue != "" {
			utils.DeleteFile(*setting.SetValue)
		}
		newValue = filePath

	case "files", "images":
		uploadedPaths, err := utils.UploadFileFlex(c, "set_value", "settings")
		if err != nil {
			return utils.RespApi(c, "bad", "Gagal upload files", err.Error())
		}
		if setting.SetValue != nil && *setting.SetValue != "" {
			var oldPaths []string
			if err := json.Unmarshal([]byte(*setting.SetValue), &oldPaths); err == nil {
				for _, oldPath := range oldPaths {
					utils.DeleteFile(oldPath)
				}
			}
		}
		filePaths = uploadedPaths
		pathBytes, _ := json.Marshal(filePaths)
		newValue = string(pathBytes)

	default:
		return utils.RespApi(c, "bad", "Tipe setting tidak didukung", nil)
	}

	if err := h.DB.Model(&setting).Update("set_value", newValue).Error; err != nil {
		// Rollback file jika gagal simpan
		if setting.SetType == "file" || setting.SetType == "image" {
			if newValue != "" {
				utils.DeleteFile(newValue)
			}
		} else if setting.SetType == "files" || setting.SetType == "images" {
			for _, path := range filePaths {
				utils.DeleteFile(path)
			}
		}
		return utils.RespApi(c, "ise", "Gagal memberikan nilai ke Setting", err.Error())
	}

	// Refresh data
	if err := h.DB.First(&setting, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data setting terbaru", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil memberikan nilai data Setting", setting)
}

// UpdateSetting: update semua field kecuali SetValue (karena di-handle terpisah via ValueSetting)
func (h *SettingHandler) UpdateSetting(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	var input SettingInitialInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	var setting models.Setting
	if err := h.DB.First(&setting, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal Mendapatkan Setting", err.Error())
	}

	// Update semua field kecuali SetValue
	updates := map[string]interface{}{
		"name":        input.Name,
		"description": input.Description,
		"set_key":     input.SetKey,
		"group_key":   input.GroupID,
		"set_type":    input.SetType,
		"set_options": input.SetOptions,
		"is_urgent":   input.IsUrgent,
	}

	if err := h.DB.Model(&setting).Updates(updates).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal memperbarui data Setting", err.Error())
	}

	// Ambil data terbaru
	if err := h.DB.First(&setting, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data terbaru", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil memperbarui data Setting", setting)
}

// DeleteSetting: hapus setting (termasuk file jika ada), tapi tidak hapus group
func (h *SettingHandler) DeleteSetting(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	var setting models.Setting
	if err := h.DB.First(&setting, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal Mendapatkan Setting", err.Error())
	}

	// Hapus file terkait
	if setting.SetValue != nil && *setting.SetValue != "" {
		switch setting.SetType {
		case "file", "image":
			utils.DeleteFile(*setting.SetValue)
		case "files", "images":
			var paths []string
			if err := json.Unmarshal([]byte(*setting.SetValue), &paths); err == nil {
				for _, path := range paths {
					if path != "" {
						utils.DeleteFile(path)
					}
				}
			}
		}
	}

	// Jangan hapus jika urgent
	if setting.IsUrgent {
		return utils.RespApi(c, "bad", "Setting ini bersifat urgent dan tidak dapat dihapus", nil)
	}

	if err := h.DB.Delete(&setting).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal Menghapus Setting", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil Menghapus Setting", nil)
}
