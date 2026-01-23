package handlers

import (
	"aldev/modules/auth/models"
	cmsModels "aldev/modules/cms/models"
	"aldev/utils"
	"fmt"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OfficeInput struct {
	Name              string  `json:"name" validate:"required,min=3,max=255"`
	Description       *string `json:"description"`
	Address           string  `json:"address" validate:"required"`
	Latitude          float64 `json:"latitude" validate:"required,min=-90,max=90"`
	Longitude         float64 `json:"longitude" validate:"required,min=-180,max=180"`
	IsStrictRadius    bool    `json:"is_strict_radius"`
	RadiusForCheckin  bool    `json:"radius_for_checkin"`
	RadiusForCheckout bool    `json:"radius_for_checkout"`
	RadiusAllow       float64 `json:"radius_allow" validate:"required,min=1,max=10000"`
}

type OfficeHandler struct {
	DB *gorm.DB
}

func NewOfficeHandler(db *gorm.DB) *OfficeHandler {
	return &OfficeHandler{DB: db}
}

// GetAllOffices - GET /api/offices
func (h *OfficeHandler) GetAllOffices(c *fiber.Ctx) error {
	var offices []cmsModels.Office

	// Get query parameters for pagination
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)
	search := c.Query("search", "")

	offset := (page - 1) * limit

	query := h.DB.Model(&cmsModels.Office{})

	// Search by name or address
	if search != "" {
		query = query.Where("name LIKE ? OR address LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menghitung total offices", err.Error())
	}

	// Get offices with user count
	if err := query.
		Preload("Users").
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&offices).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data offices", err.Error())
	}

	// Add user count to response
	type OfficeWithCount struct {
		cmsModels.Office
		UserCount int `json:"user_count"`
	}

	officesWithCount := make([]OfficeWithCount, len(offices))
	for i, office := range offices {
		officesWithCount[i] = OfficeWithCount{
			Office:    office,
			UserCount: len(office.Users),
		}
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data offices", fiber.Map{
		"data":  officesWithCount,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetOffice - GET /api/offices/:id
func (h *OfficeHandler) GetOffice(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	var office cmsModels.Office
	if err := h.DB.Preload("Users").First(&office, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data office", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data office", office)
}

// CreateOffice - POST /api/offices
func (h *OfficeHandler) CreateOffice(c *fiber.Ctx) error {
	var input OfficeInput

	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	office := cmsModels.Office{
		Name:              input.Name,
		Description:       input.Description,
		Address:           input.Address,
		Latitude:          input.Latitude,
		Longitude:         input.Longitude,
		IsStrictRadius:    input.IsStrictRadius,
		RadiusForCheckin:  input.RadiusForCheckin,
		RadiusForCheckout: input.RadiusForCheckout,
		RadiusAllow:       input.RadiusAllow,
	}

	if err := h.DB.Create(&office).Error; err != nil {
		return utils.RespApi(c, "ise", "Tidak dapat membuat office", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil membuat data office", office)
}

// UpdateOffice - PATCH /api/offices/:id
func (h *OfficeHandler) UpdateOffice(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	var input OfficeInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	var office cmsModels.Office
	if err := h.DB.First(&office, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan office", err.Error())
	}

	updates := map[string]interface{}{
		"name":                input.Name,
		"description":         input.Description,
		"address":             input.Address,
		"latitude":            input.Latitude,
		"longitude":           input.Longitude,
		"is_strict_radius":    input.IsStrictRadius,
		"radius_for_checkin":  input.RadiusForCheckin,
		"radius_for_checkout": input.RadiusForCheckout,
		"radius_allow":        input.RadiusAllow,
	}

	if err := h.DB.Model(&office).Updates(updates).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal memperbarui data office", err.Error())
	}

	// Refresh data
	if err := h.DB.First(&office, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data office terbaru", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil memperbarui data office", office)
}

// DeleteOffice - DELETE /api/offices/:id
func (h *OfficeHandler) DeleteOffice(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	var office cmsModels.Office
	if err := h.DB.First(&office, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan office", err.Error())
	}

	// Check if office has assigned users
	var userCount int64
	if err := h.DB.Model(&models.User{}).Where("office_id = ?", id).Count(&userCount).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal memeriksa users yang terkait", err.Error())
	}

	if userCount > 0 {
		return utils.RespApi(c, "bad", fmt.Sprintf("Tidak dapat menghapus office. Masih ada %d user yang terkait dengan office ini", userCount), nil)
	}

	if err := h.DB.Delete(&office).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menghapus office", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil menghapus office", nil)
}

// AssignUsers - POST /api/offices/:id/assign-users
func (h *OfficeHandler) AssignUsers(c *fiber.Ctx) error {
	idStr := c.Params("id")
	officeID, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID office tidak valid", nil)
	}

	var input struct {
		UserIDs []uuid.UUID `json:"user_ids" validate:"required"`
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

	// Verify office exists
	var office cmsModels.Office
	if err := h.DB.First(&office, "id = ?", officeID).Error; err != nil {
		return utils.RespApi(c, "ise", "Office tidak ditemukan", err.Error())
	}

	// Update all users to assign to this office
	if err := h.DB.Model(&models.User{}).
		Where("id IN ?", input.UserIDs).
		Update("office_id", officeID).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal meng-assign users ke office", err.Error())
	}

	return utils.RespApi(c, "ok", fmt.Sprintf("Berhasil meng-assign %d users ke office %s", len(input.UserIDs), office.Name), nil)
}

// GetOfficeUsers - GET /api/offices/:id/users
func (h *OfficeHandler) GetOfficeUsers(c *fiber.Ctx) error {
	idStr := c.Params("id")
	officeID, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID office tidak valid", nil)
	}

	var users []models.User
	if err := h.DB.Where("office_id = ?", officeID).Preload("Role").Find(&users).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan users", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan users", users)
}
