package utils

import (
	"fmt"

	"github.com/nyaruka/phonenumbers"
)

// NormalizePhone mengubah nomor HP ke format internasional (E.164)
func NormalizePhone(phone string, defaultRegion string) (string, error) {
	// Parse nomor dengan asumsi region default (misalnya "ID" untuk Indonesia)
	num, err := phonenumbers.Parse(phone, defaultRegion)
	if err != nil {
		fmt.Printf("nomor tidak valid: %v", err)
		return "", fmt.Errorf("nomor tidak valid: %w", err)
	}

	// Validasi apakah nomor memang valid untuk region tersebut
	if !phonenumbers.IsValidNumber(num) {
		fmt.Printf("nomor tidak valid untuk region %s", defaultRegion)
		return "", fmt.Errorf("nomor tidak valid untuk region %s", defaultRegion)
	}

	// Format E.164 = format internasional standar (contoh: +6281234567890)
	formatted := phonenumbers.Format(num, phonenumbers.E164)

	return formatted, nil
}
