package handlers

import (
	authModels "aldev/modules/auth/models"
	cmsModels "aldev/modules/cms/models"
	"aldev/utils"
	"fmt"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CompanyInput digunakan untuk create dan update via multipart/form-data
type CompanyInput struct {
	Name    string     `form:"name" validate:"required,min=2,max=255"`
	Address string     `form:"address" validate:"required"`
	Phone   string     `form:"phone" validate:"required"`
	PicName string     `form:"pic_name" validate:"required"`
	Email   string     `form:"email" validate:"required,email"`
	OwnerID *uuid.UUID `form:"owner_id"` // User ID yang di-assign sebagai Company Owner
}

type CompanyHandler struct {
	DB *gorm.DB
}

func NewCompanyHandler(db *gorm.DB) *CompanyHandler {
	return &CompanyHandler{DB: db}
}

// GetAllCompanies — GET /api/companies
func (h *CompanyHandler) GetAllCompanies(c *fiber.Ctx) error {
	var companies []cmsModels.Company

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)
	search := c.Query("search", "")
	offset := (page - 1) * limit

	query := h.DB.Model(&cmsModels.Company{})

	if search != "" {
		query = query.Where("name LIKE ? OR email LIKE ? OR phone LIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// Filter by company_id if user is Company Owner
	userIDStr, ok := c.Locals("user_id").(string)
	if ok && userIDStr != "" {
		var currentUser authModels.User
		if err := h.DB.Preload("Role").First(&currentUser, "id = ?", userIDStr).Error; err == nil {
			if currentUser.RoleID != nil && currentUser.Role.Name == "Company Owner" && currentUser.CompanyID != nil {
				query = query.Where("id = ?", currentUser.CompanyID)
			}
		}
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menghitung total company", err.Error())
	}

	if err := query.
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&companies).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data company", err.Error())
	}

	// Tambahkan URL prefix ke logo
	apiHost := c.BaseURL()
	for i := range companies {
		if companies[i].Logo != nil && *companies[i].Logo != "" {
			logoURL := fmt.Sprintf("%s/%s", apiHost, *companies[i].Logo)
			companies[i].Logo = &logoURL
		}
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data company", fiber.Map{
		"data":  companies,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetCompany — GET /api/companies/:id
func (h *CompanyHandler) GetCompany(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	var company cmsModels.Company
	if err := h.DB.First(&company, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data company", err.Error())
	}

	// Tambahkan URL prefix ke logo
	if company.Logo != nil && *company.Logo != "" {
		logoURL := fmt.Sprintf("%s/%s", c.BaseURL(), *company.Logo)
		company.Logo = &logoURL
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data company", company)
}

// CreateCompany — POST /api/companies (multipart/form-data)
func (h *CompanyHandler) CreateCompany(c *fiber.Ctx) error {
	var input CompanyInput

	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	company := cmsModels.Company{
		Name:    input.Name,
		Address: input.Address,
		Phone:   input.Phone,
		PicName: input.PicName,
		Email:   input.Email,
	}

	// Upload logo jika ada
	_, err := c.FormFile("logo")
	if err == nil {
		logoPath, uploadErr := utils.UploadFile(c, "logo", "company")
		if uploadErr != nil {
			return utils.RespApi(c, "bad", "Gagal upload logo", uploadErr.Error())
		}
		company.Logo = &logoPath
	}

	if err := h.DB.Create(&company).Error; err != nil {
		// Rollback logo jika gagal save
		if company.Logo != nil {
			utils.DeleteFile(*company.Logo)
		}
		return utils.RespApi(c, "ise", "Tidak dapat membuat company", err.Error())
	}

	// Assign owner
	if input.OwnerID != nil {
		h.DB.Exec("UPDATE users SET company_id = ? WHERE id = ?", company.ID, input.OwnerID)
	}

	return utils.RespApi(c, "ok", "Berhasil membuat data company", company)
}

// UpdateCompany — PATCH /api/companies/:id (multipart/form-data)
func (h *CompanyHandler) UpdateCompany(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	var company cmsModels.Company
	if err := h.DB.First(&company, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan company", err.Error())
	}

	var input CompanyInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	updates := map[string]interface{}{
		"name":     input.Name,
		"address":  input.Address,
		"phone":    input.Phone,
		"pic_name": input.PicName,
		"email":    input.Email,
	}

	// Upload logo baru jika ada (mengganti yang lama)
	_, logoErr := c.FormFile("logo")
	if logoErr == nil {
		oldLogo := ""
		if company.Logo != nil {
			oldLogo = *company.Logo
		}
		newLogoPath, uploadErr := utils.UpdateFile(c, oldLogo, "logo", "company")
		if uploadErr != nil {
			return utils.RespApi(c, "bad", "Gagal upload logo baru", uploadErr.Error())
		}
		updates["logo"] = newLogoPath
	}

	if err := h.DB.Model(&company).Updates(updates).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal memperbarui data company", err.Error())
	}

	// Assign owner
	if input.OwnerID != nil {
		h.DB.Exec("UPDATE users SET company_id = ? WHERE id = ?", company.ID, input.OwnerID)
	}

	// Refresh data
	if err := h.DB.First(&company, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data company terbaru", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil memperbarui data company", company)
}

// DeleteCompany — DELETE /api/companies/:id
func (h *CompanyHandler) DeleteCompany(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	var company cmsModels.Company
	if err := h.DB.First(&company, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan company", err.Error())
	}

	if err := h.DB.Delete(&company).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menghapus company", err.Error())
	}

	// Hapus logo dari disk setelah record berhasil dihapus
	if company.Logo != nil && *company.Logo != "" {
		utils.DeleteFile(*company.Logo)
	}

	return utils.RespApi(c, "ok", "Berhasil menghapus company", nil)
}
