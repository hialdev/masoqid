package utils

import (
	"os"

	"github.com/gofiber/fiber/v2"
)

// IsProduction checks if the app is running in production mode
func IsProduction() bool {
	return os.Getenv("APP_ENV") == "production"
}

// SanitizeUserData removes sensitive fields from user data in production
func SanitizeUserData(data interface{}) interface{} {
	if !IsProduction() {
		return data
	}

	// If data is a map, remove sensitive fields
	if mapData, ok := data.(fiber.Map); ok {
		// Remove sensitive fields
		delete(mapData, "password")
		delete(mapData, "refresh_token")
		delete(mapData, "access_token")

		// Sanitize nested user object if exists
		if user, ok := mapData["user"].(fiber.Map); ok {
			delete(user, "password")
			delete(user, "deleted_at")
			mapData["user"] = user
		}

		return mapData
	}

	return data
}

// SanitizeAuthResponse removes sensitive data from authentication responses in production
func SanitizeAuthResponse(data interface{}) interface{} {
	if !IsProduction() {
		return data
	}

	if mapData, ok := data.(fiber.Map); ok {
		// Remove tokens from response body (they should only be in cookies)
		delete(mapData, "access_token")
		delete(mapData, "refresh_token")

		// Sanitize user data if exists
		if user, ok := mapData["user"].(fiber.Map); ok {
			delete(user, "password")
			delete(user, "deleted_at")
			delete(user, "country_code")
			delete(user, "phone")
			delete(user, "email")

			// Keep only essential user info in production
			sanitizedUser := fiber.Map{
				"id":       user["id"],
				"name":     user["name"],
				"username": user["username"],
				"image":    user["image"],
			}

			// Keep role if exists
			if role, ok := user["role"]; ok {
				sanitizedUser["role"] = role
			}

			mapData["user"] = sanitizedUser
		}

		// Remove detailed permissions in production (client should fetch separately)
		delete(mapData, "permissions")

		return mapData
	}

	return data
}

// SanitizeErrorResponse removes sensitive error details in production
func SanitizeErrorResponse(data interface{}) interface{} {
	if !IsProduction() {
		return data
	}

	// In production, don't expose detailed error messages
	if strData, ok := data.(string); ok {
		// Check if it's an error message with sensitive info
		if len(strData) > 100 {
			return "An error occurred. Please contact support."
		}
	}

	return data
}

// SecureRespApi is a wrapper around RespApi that sanitizes responses in production
func SecureRespApi(c *fiber.Ctx, respType string, message string, data interface{}, isAuthEndpoint bool) error {
	var sanitizedData interface{}

	if IsProduction() {
		if isAuthEndpoint {
			sanitizedData = SanitizeAuthResponse(data)
		} else {
			sanitizedData = SanitizeUserData(data)
		}

		// Sanitize error data
		if respType == "ise" || respType == "bad" || respType == "perm" {
			sanitizedData = SanitizeErrorResponse(sanitizedData)
		}
	} else {
		sanitizedData = data
	}

	return RespApi(c, respType, message, sanitizedData)
}
