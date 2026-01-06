package connection

import (
	"fmt"
	"os"
	"strconv"

	gomail "gopkg.in/gomail.v2"
)

// EmailDialer menyimpan koneksi ke SMTP
var EmailDialer *gomail.Dialer

// InitEmail menginisialisasi koneksi SMTP dari .env
func InitEmail() error {
	host := os.Getenv("SMTP_HOST")
	portStr := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")

	port, err := strconv.Atoi(portStr)
	if err != nil {
		return fmt.Errorf("invalid SMTP_PORT: %w", err)
	}

	// Buat dialer
	EmailDialer = gomail.NewDialer(host, port, user, pass)
	return nil
}
