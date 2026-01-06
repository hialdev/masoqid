package utils

import (
	"math/rand"
)

func GenerateRandomOTP(length int) string {
	const otpCharset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	code := make([]byte, length)
	for i := range code {
		code[i] = otpCharset[rand.Intn(len(otpCharset))]
	}
	return string(code)
}
