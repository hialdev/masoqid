// handlers/waHandler.go
package handlers

import (
	"aldev/connection"
	"encoding/json"
	"log"
	"time"

	"github.com/gofiber/websocket/v2"
)

type WSMessage struct {
	Type    string      `json:"type"`
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type WSRequest struct {
	Action string `json:"action"`
}

func WAHandler(c *websocket.Conn) {
	defer c.Close()

	// Set close handler
	c.SetCloseHandler(func(code int, text string) error {
		return nil // Handle close gracefully
	})

	// Initialize WA client
	if err := connection.InitWAClient(); err != nil {
		log.Printf("Failed to init WA client: %v", err)
		return
	}

	// Send initial status
	sendStatus(c)

	for {
		_, msg, err := c.ReadMessage()
		if err != nil {
			// Hanya log error yang tidak diharapkan
			if !websocket.IsCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure, websocket.CloseNoStatusReceived) {
				log.Printf("WebSocket unexpected error: %v", err)
			}
			break
		}

		var req WSRequest
		if err := json.Unmarshal(msg, &req); err != nil {
			sendMessage(c, "error", false, "Invalid request", nil)
			continue
		}

		switch req.Action {
		case "connect":
			handleConnect(c)
		case "disconnect":
			handleDisconnect(c)
		case "status":
			sendStatus(c)
		case "reset": // Tambahan untuk force reset
			handleReset(c)
		default:
			sendMessage(c, "error", false, "Unknown action", nil)
		}
	}
}

func handleConnect(c *websocket.Conn) {
	if connection.IsConnected() {
		userID := connection.GetUserID()
		sendMessage(c, "connected", true, "Already connected", userID)
		return
	}

	qrChan, err := connection.ConnectWA()
	if err != nil {
		log.Printf("Connect error: %v", err)
		// Jika gagal connect, coba reset client
		if resetErr := connection.ResetWAClient(); resetErr != nil {
			log.Printf("Reset error: %v", resetErr)
		}
		sendMessage(c, "error", false, "Failed to connect, please try again", nil)
		return
	}

	if qrChan == nil {
		// Already connected
		userID := connection.GetUserID()
		sendMessage(c, "connected", true, "Connected", userID)
		return
	}

	// Handle QR events dengan timeout
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("QR handler panic: %v", r)
			}
		}()

		timeout := time.NewTimer(90 * time.Second)
		defer timeout.Stop()

		for {
			select {
			case evt, ok := <-qrChan:
				if !ok {
					sendMessage(c, "error", false, "QR channel closed", nil)
					return
				}

				switch evt.Event {
				case "code":
					timeout.Reset(90 * time.Second)
					sendMessage(c, "qr", true, "Scan QR code", evt.Code)
				case "success":
					userID := connection.GetUserID()
					sendMessage(c, "connected", true, "Connected successfully", userID)
					return
				case "timeout":
					sendMessage(c, "timeout", false, "QR timeout", nil)
					return
				}
			case <-timeout.C:
				sendMessage(c, "timeout", false, "Connection timeout", nil)
				return
			}
		}
	}()
}

func handleDisconnect(c *websocket.Conn) {
	// Selalu kirim status disconnected terlebih dahulu
	sendMessage(c, "disconnected", true, "Disconnecting...", nil)

	err := connection.DisconnectWA()
	if err != nil {
		log.Printf("Disconnect error: %v", err)
		sendMessage(c, "error", false, "Disconnect failed", nil)
		return
	}

	// Confirm disconnection
	sendMessage(c, "disconnected", true, "Disconnected successfully", nil)
}

func handleReset(c *websocket.Conn) {
	err := connection.ResetWAClient()
	if err != nil {
		log.Printf("Reset error: %v", err)
		sendMessage(c, "error", false, "Reset failed", nil)
		return
	}
	sendMessage(c, "reset", true, "Client reset successfully", nil)
}

func sendStatus(c *websocket.Conn) {
	// Double check untuk memastikan status yang akurat
	client := connection.GetWAClient()
	if client != nil && connection.IsConnected() {
		userID := connection.GetUserID()
		sendMessage(c, "connected", true, "Connected", userID)
	} else {
		sendMessage(c, "disconnected", false, "Not connected", nil)
	}
}

func sendMessage(c *websocket.Conn, msgType string, success bool, message string, data interface{}) {
	msg := WSMessage{
		Type:    msgType,
		Success: success,
		Message: message,
		Data:    data,
	}

	if err := c.WriteJSON(msg); err != nil {
		log.Printf("Failed to send message: %v", err)
	}
}
