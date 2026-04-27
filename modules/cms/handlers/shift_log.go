package handlers

import (
	authModels "aldev/modules/auth/models"
	"aldev/modules/cms/models"
	"aldev/utils"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ShiftLogHandler struct {
	DB *gorm.DB
}

func NewShiftLogHandler(db *gorm.DB) *ShiftLogHandler {
	return &ShiftLogHandler{DB: db}
}

// GetAllLogs - GET /api/shift-logs
func (h *ShiftLogHandler) GetAllLogs(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	offset := (page - 1) * limit

	query := h.DB.Model(&models.ShiftLog{})

	// Multi-tenancy
	userIDStrFromCtx, ok := c.Locals("user_id").(string)
	if ok && userIDStrFromCtx != "" {
		var currentUser authModels.User
		if err := h.DB.Preload("Role").First(&currentUser, "id = ?", userIDStrFromCtx).Error; err == nil {
			isManager := currentUser.Role.Name == "Company Owner" || currentUser.Role.Name == "Office Manager"
			if isManager && currentUser.CompanyID != nil {
				// Join to shifts and users to filter by company
				query = query.Joins("JOIN shifts ON shifts.id = shift_logs.shift_id").
					Joins("JOIN users ON users.id = shifts.user_id").
					Where("users.company_id = ?", currentUser.CompanyID)
			} else {
				// Employee: only logs related to their shifts or where they are the old/new user
				userID, _ := uuid.Parse(userIDStrFromCtx)
				query = query.Joins("JOIN shifts ON shifts.id = shift_logs.shift_id").
					Where("shifts.user_id = ? OR shift_logs.old_user_id = ? OR shift_logs.new_user_id = ?", userID, userID, userID)
			}
		}
	}

	var total int64
	query.Count(&total)

	var logs []models.ShiftLog
	if err := query.Preload("OldUser").Preload("NewUser").Preload("Modifier").Preload("Shift.Office").
		Offset(offset).Limit(limit).Order("created_at DESC").Find(&logs).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan log shift", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan log shift", fiber.Map{
		"data":  logs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// RecordLog helper function to be called from other handlers
func (h *ShiftLogHandler) RecordLog(tx *gorm.DB, log models.ShiftLog) error {
	if tx == nil {
		tx = h.DB
	}
	return tx.Create(&log).Error
}
