package middlewares

import (
	"aldev/connection"
	"aldev/modules/auth/models"
	"aldev/utils"
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func DoACL(requiredPerms ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// === 1. Ambil user_id dari context (JWT middleware harus sudah set ini) ===
		userIDRaw := c.Locals("user_id")
		if userIDRaw == nil {
			return utils.RespApi(c, "unauthorized", "User tidak terautentikasi", nil)
		}

		// Konversi ke tipe yang sesuai (misal: int64 atau string)
		var userID uuid.UUID
		parsedID, err := uuid.Parse(userIDRaw.(string))
		if err != nil {
			return utils.RespApi(c, "fbd", "ID user tidak valid", nil)
		} else {
			userID = parsedID
		}

		// === 2. Ambil user + role + permissions dalam satu query (eager loading) ===
		var user models.User
		if err := connection.DB.Preload("Role.Permissions").First(&user, "id = ?", userID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return utils.RespApi(c, "fbd", "User tidak ditemukan", nil)
			}
			return utils.RespApi(c, "ise", "Gagal mengambil data user", err.Error())
		}

		// === 3. Pastikan user memiliki role ===
		if user.RoleID == nil || user.RoleID.String() == "" {
			return utils.RespApi(c, "fbd", "Tidak memiliki role yang sah", nil)
		}

		// === 4. Ekstrak nama permission dari relasi ===
		var userPerms []string
		for _, perm := range user.Role.Permissions {
			if perm.Name != "" {
				userPerms = append(userPerms, perm.Name)
			}
		}

		// === 5. Cek apakah user memiliki SALAH SATU izin yang dibutuhkan ===
		hasPermission := false
		for _, required := range requiredPerms {
			for _, userPerm := range userPerms {
				if userPerm == required {
					hasPermission = true
					break
				}
			}
			if hasPermission {
				break
			}
		}

		if !hasPermission {
			return utils.RespApi(c, "fbd", "Akses ditolak: izin tidak mencukupi", map[string]interface{}{
				"required": requiredPerms,
				"granted":  userPerms,
			})
		}

		// === 6. Jika lolos, lanjut ke handler berikutnya ===
		return c.Next()
	}
}
