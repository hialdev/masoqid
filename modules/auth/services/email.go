package services

import (
	"aldev/connection"
	"bytes"
	"fmt"
	"html/template"
	"os"
	"path/filepath"

	"gopkg.in/gomail.v2"
)

// SendEmail kirim email dengan subject dan body HTML
func SendEmail(to, subject, body string) error {
	from := os.Getenv("SMTP_FROM")
	name := os.Getenv("SMTP_NAME")

	m := gomail.NewMessage()
	m.SetHeader("From", m.FormatAddress(from, name))
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", body)

	if err := connection.EmailDialer.DialAndSend(m); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// SendEmailWithTemplate kirim email menggunakan file template HTML
func SendEmailWithTemplate(to, subject, templateFile string, data any) error {
	// Parse template
	tmpl, err := template.ParseFiles(filepath.Clean(templateFile))
	if err != nil {
		return fmt.Errorf("failed to parse template: %w", err)
	}

	// Render template ke string
	var bodyBuilder bytes.Buffer
	err = tmpl.Execute(&bodyBuilder, data)
	if err != nil {
		return fmt.Errorf("failed to execute template: %w", err)
	}

	// Kirim email
	return SendEmail(to, subject, bodyBuilder.String())
}
