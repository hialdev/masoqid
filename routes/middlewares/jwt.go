package middlewares

import (
	"aldev/connection"
	"aldev/modules/auth/models"
	"aldev/utils"
	"fmt"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func JWTProtected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		fmt.Println("\n=== ENTERING JWTProtected ===")

		// 🔑 Ambil token dari cookie (bukan dari header lagi)
		tokenStr := c.Cookies("accessToken")
		if tokenStr == "" {
			fmt.Println("❌ No accessToken cookie found")
			return utils.RespApi(c, "perm", "Token tidak ditemukan", nil)
		}
		fmt.Printf("✅ Token from cookie: %.50s...\n", tokenStr)

		// 🔐 Parse token
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (any, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.NewError(fiber.StatusUnauthorized, "Signing method tidak valid")
			}
			return []byte(os.Getenv("APP_SECRET")), nil
		})

		if err != nil || !token.Valid {
			fmt.Printf("❌ Invalid token: %v\n", err)
			return utils.RespApi(c, "perm", "Token tidak valid", nil)
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			fmt.Println("❌ Failed to cast claims to MapClaims")
			return utils.RespApi(c, "perm", "Claim token tidak valid", nil)
		}

		if claims["type"] != "access" {
			fmt.Printf("❌ Token type is not 'access', got: %v\n", claims["type"])
			return utils.RespApi(c, "perm", "Token bukan access token", nil)
		}

		userID, _ := claims["user_id"].(string)
		var user models.User
		if err := connection.DB.First(&user, "id = ?", userID).Error; err != nil {
			return utils.RespApi(c, "ise", "User tidak ditemukan!", err.Error());
		}
		fmt.Printf("✅ User ID: %s\n", userID)

		// Simpan ke locals
		if perms, exists := claims["permissions"]; exists {
			fmt.Printf("✅ Permissions in token: %+v (type: %T)\n", perms, perms)
			c.Locals("permissions", perms)
		} else {
			c.Locals("permissions", []interface{}{})
		}

		c.Locals("user", token)
		c.Locals("user_id", claims["user_id"])

		fmt.Println("✅ JWTProtected PASSED — moving to next middleware")
		return c.Next()
	}
}
