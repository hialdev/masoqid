package handlers

import (
	authModels "aldev/modules/auth/models"
	cmsModels "aldev/modules/cms/models"
	"aldev/utils"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ShiftSwitchHandler struct {
	DB *gorm.DB
}

func NewShiftSwitchHandler(db *gorm.DB) *ShiftSwitchHandler {
	return &ShiftSwitchHandler{DB: db}
}

// CreateRequest - POST /api/shift-switch-requests (Employee)
func (h *ShiftSwitchHandler) CreateRequest(c *fiber.Ctx) error {
	requesterIDStr, ok := c.Locals("user_id").(string)
	if !ok {
		return utils.RespApi(c, "perm", "User tidak terautentikasi", nil)
	}

	requesterID, err := uuid.Parse(requesterIDStr)
	if err != nil {
		return utils.RespApi(c, "bad", "User ID tidak valid", nil)
	}

	var input struct {
		TargetID         string  `json:"target_id" validate:"required,uuid"`
		RequesterShiftID string  `json:"requester_shift_id" validate:"required,uuid"`
		TargetShiftID    string  `json:"target_shift_id" validate:"required,uuid"`
		Reason           *string `json:"reason,omitempty"`
	}

	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
	}

	targetID, _ := uuid.Parse(input.TargetID)
	requesterShiftID, _ := uuid.Parse(input.RequesterShiftID)
	targetShiftID, _ := uuid.Parse(input.TargetShiftID)

	// Cek tidak ada pending request yang sama
	var existing cmsModels.ShiftSwitchRequest
	if err := h.DB.Where(
		"requester_id = ? AND requester_shift_id = ? AND status = 'pending'",
		requesterID, requesterShiftID,
	).First(&existing).Error; err == nil {
		return utils.RespApi(c, "bad", "Sudah ada permintaan tukar shift yang menunggu persetujuan", nil)
	}

	req := cmsModels.ShiftSwitchRequest{
		RequesterID:      requesterID,
		TargetID:         targetID,
		RequesterShiftID: requesterShiftID,
		TargetShiftID:    targetShiftID,
		Status:           "pending",
		Reason:           input.Reason,
	}

	if err := h.DB.Create(&req).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal membuat permintaan tukar shift", err.Error())
	}

	return utils.RespApi(c, "ok", "Permintaan tukar shift berhasil dikirim", req)
}

// GetAllRequests - GET /api/shift-switch-requests (Manager/Owner)
func (h *ShiftSwitchHandler) GetAllRequests(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	status := c.Query("status", "")
	offset := (page - 1) * limit

	query := h.DB.Model(&cmsModels.ShiftSwitchRequest{})

	// Filter by company_id if user is Manager (Owner/Office Manager)
	userIDStrFromCtx, ok := c.Locals("user_id").(string)
	if ok && userIDStrFromCtx != "" {
		var currentUser authModels.User
		if err := h.DB.Preload("Role").First(&currentUser, "id = ?", userIDStrFromCtx).Error; err == nil {
			isManager := currentUser.Role.Name == "Company Owner" || currentUser.Role.Name == "Office Manager"
			if currentUser.RoleID != nil && isManager && currentUser.CompanyID != nil {
				query = query.Joins("JOIN users ON users.id = shift_switch_requests.requester_id").
					Where("users.company_id = ?", currentUser.CompanyID)
			}
		}
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	query.Count(&total)

	var requests []cmsModels.ShiftSwitchRequest
	if err := query.Preload("Requester").
		Preload("Target").
		Preload("RequesterShift.Office").
		Preload("TargetShift.Office").
		Offset(offset).Limit(limit).
		Order("created_at DESC").Find(&requests).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data permintaan tukar shift", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data permintaan tukar shift", fiber.Map{
		"data":  requests,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetMyRequests - GET /api/my-shift-switch-requests (JWT only)
func (h *ShiftSwitchHandler) GetMyRequests(c *fiber.Ctx) error {
	userIDStr, ok := c.Locals("user_id").(string)
	if !ok {
		return utils.RespApi(c, "perm", "User tidak terautentikasi", nil)
	}
	userID, _ := uuid.Parse(userIDStr)

	var requests []cmsModels.ShiftSwitchRequest
	if err := h.DB.Preload("Requester").
		Preload("Target").
		Preload("RequesterShift.Office").
		Preload("TargetShift.Office").
		Where("requester_id = ? OR target_id = ?", userID, userID).
		Order("created_at DESC").Find(&requests).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan permintaan tukar shift", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan permintaan tukar shift saya", requests)
}

// ApproveRequest - PATCH /api/shift-switch-requests/:id/approve
func (h *ShiftSwitchHandler) ApproveRequest(c *fiber.Ctx) error {
	return h.reviewRequest(c, "approved")
}

// RejectRequest - PATCH /api/shift-switch-requests/:id/reject
func (h *ShiftSwitchHandler) RejectRequest(c *fiber.Ctx) error {
	return h.reviewRequest(c, "rejected")
}

func (h *ShiftSwitchHandler) reviewRequest(c *fiber.Ctx, newStatus string) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID tidak valid", nil)
	}

	reviewerIDStr, _ := c.Locals("user_id").(string)
	reviewerID, _ := uuid.Parse(reviewerIDStr)

	var req cmsModels.ShiftSwitchRequest
	if err := h.DB.First(&req, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "Permintaan tidak ditemukan", nil)
	}

	if req.Status != "pending" {
		return utils.RespApi(c, "bad", "Permintaan sudah diproses sebelumnya", nil)
	}

	var input struct {
		ReviewNote *string `json:"review_note,omitempty"`
	}
	c.BodyParser(&input)

	now := time.Now()
	updates := map[string]interface{}{
		"status":      newStatus,
		"reviewed_by": reviewerID,
		"reviewed_at": now,
		"review_note": input.ReviewNote,
	}

	if err := h.DB.Model(&req).Updates(updates).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal memperbarui status permintaan", err.Error())
	}

	// Jika approved, lakukan actual switch di tabel shifts
	if newStatus == "approved" {
		if err := h.swapShifts(req.RequesterShiftID, req.TargetShiftID, req.RequesterID, req.TargetID); err != nil {
			return utils.RespApi(c, "ise", "Permintaan disetujui namun gagal menukar shift", err.Error())
		}
		
		// Record Log
		h.DB.Create(&cmsModels.ShiftLog{
			ShiftID:    req.RequesterShiftID,
			Type:       "switch_request",
			OldUserID:  &req.RequesterID,
			NewUserID:  &req.TargetID,
			ChangedBy:  reviewerID,
			Reason:     "Approved switch request",
		})
		h.DB.Create(&cmsModels.ShiftLog{
			ShiftID:    req.TargetShiftID,
			Type:       "switch_request",
			OldUserID:  &req.TargetID,
			NewUserID:  &req.RequesterID,
			ChangedBy:  reviewerID,
			Reason:     "Approved switch request",
		})
	}

	statusMsg := "Permintaan tukar shift disetujui"
	if newStatus == "rejected" {
		statusMsg = "Permintaan tukar shift ditolak"
	}

	return utils.RespApi(c, "ok", statusMsg, req)
}

// swapShifts menukar user_id antara dua shift record
func (h *ShiftSwitchHandler) swapShifts(shiftAID, shiftBID, userA, userB uuid.UUID) error {
	return h.DB.Transaction(func(tx *gorm.DB) error {
		// Set shift A ke user B
		if err := tx.Model(&cmsModels.Shift{}).Where("id = ?", shiftAID).
			Update("user_id", userB).Error; err != nil {
			return err
		}
		// Set shift B ke user A
		if err := tx.Model(&cmsModels.Shift{}).Where("id = ?", shiftBID).
			Update("user_id", userA).Error; err != nil {
			return err
		}
		return nil
	})
}
