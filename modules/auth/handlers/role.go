package handlers

import (
	"aldev/modules/auth/models"
	"aldev/utils"
	"errors"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RoleHandler struct {
	DB *gorm.DB
}

type RoleInput struct {
	Name        string   `validate:"required" json:"name" form:"name"`
	Description *string  `validate:"omitempty" json:"description" form:"description"`
	Permissions []string `validate:"dive,uuid4" json:"permissions" form:"permissions[]"`
}

func NewRoleHandler(db *gorm.DB) *RoleHandler {
	return &RoleHandler{DB: db}
}

func (r *RoleHandler) GetRoles(c *fiber.Ctx) error {
	var roles []models.Role
	if err := r.DB.Preload("Permissions").Preload("Users").Find(&roles).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data roles", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data roles", roles)
}

func (r *RoleHandler) GetRole(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "UUID tidak valid", idStr)
	}

	var role models.Role
	if err := r.DB.Preload("Permissions").Preload("Users").First(&role, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return utils.RespApi(c, "empty", "Data role tidak ditemukan", err.Error())
		}
		return utils.RespApi(c, "ise", "Kesalahan sistem dalam memproses ", err.Error())
	}
	return utils.RespApi(c, "ok", "Berhasil mendapatkan data roles", role)
}

func (r *RoleHandler) CreateRole(c *fiber.Ctx) error {
	var input RoleInput

	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	var permissionsUUID []uuid.UUID
	for _, pid := range input.Permissions {
		parsedID, err := uuid.Parse(pid)
		if err != nil {
			return utils.RespApi(c, "bad", "ID permission tidak valid: "+pid, nil)
		}
		permissionsUUID = append(permissionsUUID, parsedID)
	}

	var permissions []models.Permission
	if len(permissionsUUID) > 0 {
		if err := r.DB.Where("id IN ?", permissionsUUID).Find(&permissions).Error; err != nil {
			return utils.RespApi(c, "bad", "Gagal mengambil permissions", err.Error())
		}
	}

	role := models.Role{
		Name:        input.Name,
		Description: input.Description,
		Permissions: permissions,
	}

	if err := r.DB.Session(&gorm.Session{FullSaveAssociations: true}).Omit("Permissions.*").Create(&role).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal membuat data role", err.Error())
	}

	if err := r.DB.Preload("Permissions").First(&role, "id = ?", role.ID).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mengambil data role setelah buat", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil membuat data roles", role)
}

func (r *RoleHandler) UpdateRole(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "UUID tidak valid", idStr)
	}

	var input RoleInput

	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	var permissionsUUID []uuid.UUID
	for _, pid := range input.Permissions {
		parsedID, err := uuid.Parse(pid)
		if err != nil {
			return utils.RespApi(c, "bad", "ID permission tidak valid: "+pid, nil)
		}
		permissionsUUID = append(permissionsUUID, parsedID)
	}

	var permissions []models.Permission
	if len(permissionsUUID) > 0 {
		if err := r.DB.Where("id IN ?", permissionsUUID).Find(&permissions).Error; err != nil {
			return utils.RespApi(c, "bad", "Gagal mengambil permissions", err.Error())
		}
	}

	var role models.Role
	if err := r.DB.First(&role, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "Data role tidak ditemukan", id)
	}

	if err := r.DB.Model(&role).Association("Permissions").Clear(); err != nil {
		return utils.RespApi(c, "ise", "Gagal mereset Permissions", err.Error())
	}

	role.Name = input.Name
	role.Description = input.Description
	role.Permissions = permissions

	if err := r.DB.Session(&gorm.Session{FullSaveAssociations: true}).Omit("Permissions.*").Save(&role).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal memperbarui data role", err.Error())
	}

	if err := r.DB.Preload("Permissions").First(&role, "id = ?", role.ID).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mengambil data role setelah buat", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil memperbarui data roles", role)
}

func (r *RoleHandler) DeleteRole(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)

	if err != nil {
		return utils.RespApi(c, "bad", "UUID Tidak Valid", id)
	}

	if err := r.DB.Delete(new(models.Role), "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Terjadi masalah saat menghapus data", id)
	}

	return utils.RespApi(c, "ok", "Menghapus Data", id)
}
