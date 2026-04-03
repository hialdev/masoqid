package handlers

import (
	authModels "aldev/modules/auth/models"
	"aldev/modules/cms/models"
	"aldev/utils"
	"strconv"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ShiftHandler struct {
	DB *gorm.DB
}

func NewShiftHandler(db *gorm.DB) *ShiftHandler {
	return &ShiftHandler{DB: db}
}

type ShiftInput struct {
	UserID    string `json:"user_id" validate:"required"`
	OfficeID  string `json:"office_id"` // OfficeID opsional — diisi dari office yang dipilih di UI
	Date      string `json:"date" validate:"required"` // "YYYY-MM-DD"
	StartTime string `json:"start_time" validate:"required"`
	EndTime   string `json:"end_time" validate:"required"`
	Note      string `json:"note"`
}

type SwitchShiftInput struct {
	ShiftAID string `json:"shift_a_id" validate:"required"`
	ShiftBID string `json:"shift_b_id" validate:"required"`
}

// populateShiftUser mengisi field User pada shift dari data user di DB
func (h *ShiftHandler) populateShiftUser(shifts []models.Shift) []models.Shift {
	for i, s := range shifts {
		var u authModels.User
		if err := h.DB.Select("id, name, image").First(&u, "id = ?", s.UserID).Error; err == nil {
			shifts[i].User = u
		}
	}
	return shifts
}

// GetMonthlySchedule - GET /api/shifts?month=YYYY-MM&office_id=...&user_id=...
func (h *ShiftHandler) GetMonthlySchedule(c *fiber.Ctx) error {
	monthStr := c.Query("month", time.Now().Format("2006-01"))
	userIDStr := c.Query("user_id", "")
	officeIDStr := c.Query("office_id", "")

	// Parse month untuk mendapatkan rentang tanggal
	loc, _ := time.LoadLocation("Local")
	firstDay, err := time.ParseInLocation("2006-01", monthStr, loc)
	if err != nil {
		return utils.RespApi(c, "bad", "Format bulan tidak valid, gunakan YYYY-MM", nil)
	}
	lastDay := firstDay.AddDate(0, 1, -1)

	query := h.DB.Model(&models.Shift{}).Table("shifts").
		Where("shifts.date BETWEEN ? AND ?", firstDay.Format("2006-01-02"), lastDay.Format("2006-01-02"))

	// Filter by office — join ke tabel users berdasarkan office_id user
	if officeIDStr != "" {
		if oid, err := uuid.Parse(officeIDStr); err == nil {
			query = query.Joins("JOIN users ON users.id = shifts.user_id").
				Where("users.office_id = ?", oid)
		}
	}

	if userIDStr != "" {
		if uid, err := uuid.Parse(userIDStr); err == nil {
			query = query.Where("shifts.user_id = ?", uid)
		}
	}

	var shifts []models.Shift
	if err := query.Order("shifts.date ASC, shifts.start_time ASC").Find(&shifts).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan jadwal shift", err.Error())
	}

	shifts = h.populateShiftUser(shifts)

	return utils.RespApi(c, "ok", "Jadwal shift berhasil didapatkan", fiber.Map{
		"data":  shifts,
		"month": monthStr,
	})
}

// GetMyShifts - GET /api/my-shifts?month=YYYY-MM
func (h *ShiftHandler) GetMyShifts(c *fiber.Ctx) error {
	userIDStr, ok := c.Locals("user_id").(string)
	if !ok {
		return utils.RespApi(c, "perm", "User ID tidak ditemukan", nil)
	}

	monthStr := c.Query("month", time.Now().Format("2006-01"))
	loc, _ := time.LoadLocation("Local")
	firstDay, err := time.ParseInLocation("2006-01", monthStr, loc)
	if err != nil {
		return utils.RespApi(c, "bad", "Format bulan tidak valid, gunakan YYYY-MM", nil)
	}
	lastDay := firstDay.AddDate(0, 1, -1)

	var shifts []models.Shift
	if err := h.DB.
		Where("user_id = ? AND date BETWEEN ? AND ?", userIDStr,
			firstDay.Format("2006-01-02"), lastDay.Format("2006-01-02")).
		Order("date ASC, start_time ASC").
		Find(&shifts).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan shift saya", err.Error())
	}

	return utils.RespApi(c, "ok", "Shift saya berhasil didapatkan", fiber.Map{
		"data":  shifts,
		"month": monthStr,
	})
}

// CreateShift - POST /api/shifts
func (h *ShiftHandler) CreateShift(c *fiber.Ctx) error {
	var input ShiftInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request body tidak valid", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	userID, err := uuid.Parse(input.UserID)
	if err != nil {
		return utils.RespApi(c, "bad", "Format user_id tidak valid", nil)
	}

	// Parse office_id (opsional)
	var officeID *uuid.UUID
	if input.OfficeID != "" {
		if oid, err := uuid.Parse(input.OfficeID); err == nil {
			officeID = &oid
		}
	}

	// Validasi user ada
	var u authModels.User
	if err := h.DB.First(&u, "id = ?", userID).Error; err != nil {
		return utils.RespApi(c, "bad", "User tidak ditemukan", nil)
	}

	loc, _ := time.LoadLocation("Local")
	date, err := time.ParseInLocation("2006-01-02", input.Date, loc)
	if err != nil {
		return utils.RespApi(c, "bad", "Format tanggal tidak valid, gunakan YYYY-MM-DD", nil)
	}

	var note *string
	if input.Note != "" {
		note = &input.Note
	}

	shift := models.Shift{
		UserID:    userID,
		OfficeID:  officeID,
		Date:      date,
		StartTime: input.StartTime,
		EndTime:   input.EndTime,
		Note:      note,
	}

	if err := h.DB.Create(&shift).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal membuat shift", err.Error())
	}

	shift.User = u
	return utils.RespApi(c, "ok", "Shift berhasil dibuat", shift)
}

// UpdateShift - PATCH /api/shifts/:id
func (h *ShiftHandler) UpdateShift(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID tidak valid", nil)
	}

	var shift models.Shift
	if err := h.DB.First(&shift, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "bad", "Shift tidak ditemukan", nil)
	}

	var input ShiftInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request body tidak valid", err.Error())
	}

	updates := map[string]interface{}{}

	if input.UserID != "" {
		if uid, err := uuid.Parse(input.UserID); err == nil {
			updates["user_id"] = uid
		}
	}
	if input.Date != "" {
		loc, _ := time.LoadLocation("Local")
		if d, err := time.ParseInLocation("2006-01-02", input.Date, loc); err == nil {
			updates["date"] = d
		}
	}
	if input.StartTime != "" {
		updates["start_time"] = input.StartTime
	}
	if input.EndTime != "" {
		updates["end_time"] = input.EndTime
	}
	if input.Note != "" {
		updates["note"] = input.Note
	}

	if err := h.DB.Model(&shift).Updates(updates).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal memperbarui shift", err.Error())
	}

	// Refresh
	h.DB.First(&shift, "id = ?", id)
	var u authModels.User
	if err := h.DB.Select("id, name, image").First(&u, "id = ?", shift.UserID).Error; err == nil {
		shift.User = u
	}

	return utils.RespApi(c, "ok", "Shift berhasil diperbarui", shift)
}

// DeleteShift - DELETE /api/shifts/:id
func (h *ShiftHandler) DeleteShift(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID tidak valid", nil)
	}

	var shift models.Shift
	if err := h.DB.First(&shift, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "bad", "Shift tidak ditemukan", nil)
	}

	if err := h.DB.Delete(&shift).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal menghapus shift", err.Error())
	}

	return utils.RespApi(c, "ok", "Shift berhasil dihapus", nil)
}

// SwitchShifts - POST /api/shifts/switch
// Tukar UserID antara dua shift (boleh lintas tanggal secara atomik)
func (h *ShiftHandler) SwitchShifts(c *fiber.Ctx) error {
	var input SwitchShiftInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request body tidak valid", err.Error())
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	shiftAID, err := uuid.Parse(input.ShiftAID)
	if err != nil {
		return utils.RespApi(c, "bad", "Format shift_a_id tidak valid", nil)
	}
	shiftBID, err := uuid.Parse(input.ShiftBID)
	if err != nil {
		return utils.RespApi(c, "bad", "Format shift_b_id tidak valid", nil)
	}

	if shiftAID == shiftBID {
		return utils.RespApi(c, "bad", "Tidak dapat menukar shift yang sama", nil)
	}

	var shiftA, shiftB models.Shift

	err = h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&shiftA, "id = ?", shiftAID).Error; err != nil {
			return err
		}
		if err := tx.First(&shiftB, "id = ?", shiftBID).Error; err != nil {
			return err
		}

		// Tukar UserID
		userAID := shiftA.UserID
		userBID := shiftB.UserID

		if err := tx.Model(&shiftA).Update("user_id", userBID).Error; err != nil {
			return err
		}
		if err := tx.Model(&shiftB).Update("user_id", userAID).Error; err != nil {
			return err
		}

		shiftA.UserID = userBID
		shiftB.UserID = userAID
		return nil
	})

	if err != nil {
		return utils.RespApi(c, "ise", "Gagal menukar shift", err.Error())
	}

	// Populate user info
	var uA, uB authModels.User
	if err := h.DB.Select("id, name, image").First(&uA, "id = ?", shiftA.UserID).Error; err == nil {
		shiftA.User = uA
	}
	if err := h.DB.Select("id, name, image").First(&uB, "id = ?", shiftB.UserID).Error; err == nil {
		shiftB.User = uB
	}

	return utils.RespApi(c, "ok", "Shift berhasil ditukar", fiber.Map{
		"shift_a": shiftA,
		"shift_b": shiftB,
	})
}

// GetShiftByID - GET /api/shifts/:id
func (h *ShiftHandler) GetShiftByID(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID tidak valid", nil)
	}

	var shift models.Shift
	if err := h.DB.First(&shift, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "bad", "Shift tidak ditemukan", nil)
	}

	var u authModels.User
	if err := h.DB.Select("id, name, image").First(&u, "id = ?", shift.UserID).Error; err == nil {
		shift.User = u
	}

	return utils.RespApi(c, "ok", "Detail shift", shift)
}

// GetAllShifts - GET /api/shifts/all (list dengan pagination untuk Manage Shift view)
func (h *ShiftHandler) GetAllShifts(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset := (page - 1) * limit

	query := h.DB.Model(&models.Shift{}).Table("shifts")

	// Filter by office — join ke tabel users
	if officeIDStr := c.Query("office_id"); officeIDStr != "" {
		query = query.Joins("JOIN users ON users.id = shifts.user_id").
			Where("users.office_id = ?", officeIDStr)
	}
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		query = query.Where("shifts.user_id = ?", userIDStr)
	}
	if monthStr := c.Query("month"); monthStr != "" {
		loc, _ := time.LoadLocation("Local")
		if firstDay, err := time.ParseInLocation("2006-01", monthStr, loc); err == nil {
			lastDay := firstDay.AddDate(0, 1, -1)
			query = query.Where("shifts.date BETWEEN ? AND ?", firstDay.Format("2006-01-02"), lastDay.Format("2006-01-02"))
		}
	}

	var total int64
	query.Count(&total)

	var shifts []models.Shift
	if err := query.Limit(limit).Offset(offset).Order("date ASC, start_time ASC").Find(&shifts).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data shift", err.Error())
	}

	shifts = h.populateShiftUser(shifts)

	return utils.RespApi(c, "ok", "Data shift berhasil didapatkan", fiber.Map{
		"data":  shifts,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}
