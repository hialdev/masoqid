// handlers/sendHandler.go
package handlers

import (
	"aldev/connection"
	"log"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type SendMessageRequest struct {
	To      string `json:"to" validate:"required"`
	Message string `json:"message" validate:"required"`
}

type SendMessageResponse struct {
	Success bool             `json:"success"`
	Message string           `json:"message"`
	Data    *SendMessageData `json:"data,omitempty"`
}

type SendMessageData struct {
	To            string `json:"to"`
	Message       string `json:"message"`
	IsValidNumber *bool  `json:"is_valid_number,omitempty"`
}

type CheckNumberRequest struct {
	PhoneNumber string `json:"phone_number" validate:"required"`
}

type CheckNumberResponse struct {
	Success bool             `json:"success"`
	Message string           `json:"message"`
	Data    *CheckNumberData `json:"data,omitempty"`
}

type CheckNumberData struct {
	PhoneNumber     string `json:"phone_number"`
	IsRegistered    bool   `json:"is_registered"`
	FormattedNumber string `json:"formatted_number"`
}

// SendMessageHandler handles POST /api/wa/send
func SendMessageHandler(c *fiber.Ctx) error {
	
	// Parse request body
	var req SendMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(SendMessageResponse{
			Success: false,
			Message: "Invalid request body",
		})
	}

	// Optional: Check if number is valid before sending
	isValidNumber := false
	isValid, err := connection.CheckNumber(req.To)
	if err != nil {
		log.Printf("Failed to check number %s: %v", req.To, err)
		// Continue anyway, don't fail the request
	} else {
		isValidNumber = isValid
		if !isValid {
			return c.Status(400).JSON(SendMessageResponse{
				Success: false,
				Message: "Phone number is not registered on WhatsApp",
				Data: &SendMessageData{
					To:            req.To,
					Message:       req.Message,
					IsValidNumber: &isValidNumber,
				},
			})
		}
	}

	sendMessageService(c, req, isValidNumber)

	// Success response
	return c.JSON(SendMessageResponse{
		Success: true,
		Message: "Message sent successfully",
		Data: &SendMessageData{
			To:            req.To,
			Message:       req.Message,
			IsValidNumber: &isValidNumber,
		},
	})
}

func sendMessageService(c *fiber.Ctx, messageReq SendMessageRequest, validNumber bool) (error) {
	// Check if client is connected
	if !connection.IsConnected() {
		return c.Status(400).JSON(SendMessageResponse{
			Success: false,
			Message: "WhatsApp client is not connected",
		})
	}
	
	req := messageReq

	// Validate required fields
	if strings.TrimSpace(req.To) == "" {
		return c.Status(400).JSON(SendMessageResponse{
			Success: false,
			Message: "Field 'to' is required",
		})
	}

	if strings.TrimSpace(req.Message) == "" {
		return c.Status(400).JSON(SendMessageResponse{
			Success: false,
			Message: "Field 'message' is required",
		})
	}

	// Send message with retry
	err := connection.SendMessageWithRetry(formatPhoneNumber(req.To), req.Message, 3)
	if err != nil {
		log.Printf("Failed to send message to %s: %v", req.To, err)
		return c.Status(500).JSON(SendMessageResponse{
			Success: false,
			Message: "Failed to send message: " + err.Error(),
			Data: &SendMessageData{
				To:            req.To,
				Message:       req.Message,
				IsValidNumber: &validNumber,
			},
		})
	}

	log.Println("Mengirim pesan ke:", req.To)
	log.Println("Isi pesan:", req.Message)

	return nil
}

// CheckNumberHandler handles POST /api/wa/check
func CheckNumberHandler(c *fiber.Ctx) error {
	// Check if client is connected
	if !connection.IsConnected() {
		return c.Status(400).JSON(CheckNumberResponse{
			Success: false,
			Message: "WhatsApp client is not connected",
		})
	}

	// Parse request body
	var req CheckNumberRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(CheckNumberResponse{
			Success: false,
			Message: "Invalid request body",
		})
	}

	// Validate required fields
	if strings.TrimSpace(req.PhoneNumber) == "" {
		return c.Status(400).JSON(CheckNumberResponse{
			Success: false,
			Message: "Field 'phone_number' is required",
		})
	}

	// Check number
	isRegistered, err := connection.CheckNumber(req.PhoneNumber)
	if err != nil {
		log.Printf("Failed to check number %s: %v", req.PhoneNumber, err)
		return c.Status(500).JSON(CheckNumberResponse{
			Success: false,
			Message: "Failed to check number: " + err.Error(),
		})
	}

	// Format number for display
	formattedNumber := formatPhoneNumber(req.PhoneNumber)

	return c.JSON(CheckNumberResponse{
		Success: true,
		Message: "Number checked successfully",
		Data: &CheckNumberData{
			PhoneNumber:     req.PhoneNumber,
			IsRegistered:    isRegistered,
			FormattedNumber: formattedNumber,
		},
	})
}

// Helper function to format phone number
func formatPhoneNumber(phoneNumber string) string {
	// Remove non-digit characters
	cleanNumber := ""
	for _, char := range phoneNumber {
		if char >= '0' && char <= '9' {
			cleanNumber += string(char)
		}
	}

	// Convert to international format
	if strings.HasPrefix(cleanNumber, "0") {
		cleanNumber = "62" + cleanNumber[1:]
	}

	return cleanNumber + "@s.whatsapp.net"
}
