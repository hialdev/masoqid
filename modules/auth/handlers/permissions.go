package handlers

import (
	"aldev/utils"

	"github.com/gofiber/fiber/v2"
)

// GetMyPermissions - Endpoint untuk mendapatkan permissions user yang sedang login
func (h *AuthHandler) GetMyPermissions(c *fiber.Ctx) error {
	// Ambil user_id dari context (sudah di-set oleh JWT middleware)
	userIDRaw := c.Locals("user_id")
	if userIDRaw == nil {
		return utils.SecureRespApi(c, "unauthorized", "User tidak terautentikasi", nil, true)
	}

	userID, ok := userIDRaw.(string)
	if !ok {
		return utils.SecureRespApi(c, "bad", "User ID tidak valid", nil, true)
	}

	// Ambil permissions dari service
	permissions, err := h.Service.GetUserPermissions(userID)
	if err != nil {
		return utils.SecureRespApi(c, "ise", "Gagal mengambil permissions", err.Error(), true)
	}

	return utils.SecureRespApi(c, "ok", "Permissions berhasil diambil", permissions, false)
}
