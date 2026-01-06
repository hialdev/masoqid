package utils

import (
	"database/sql"
	"encoding/json"
)

// NullableString adalah pembungkus sql.NullString agar bisa otomatis
// di-handle waktu di-marshal/unmarshal JSON.
type NullableString sql.NullString

// MarshalJSON: agar saat dikirim ke frontend, nilai null tidak error
func (ns NullableString) MarshalJSON() ([]byte, error) {
	if !ns.Valid {
		return json.Marshal(nil)
	}
	return json.Marshal(ns.String)
}

// UnmarshalJSON: agar saat menerima dari frontend bisa langsung dipakai
func (ns *NullableString) UnmarshalJSON(b []byte) error {
	var s *string
	if err := json.Unmarshal(b, &s); err != nil {
		return err
	}
	if s != nil {
		ns.Valid = true
		ns.String = *s
	} else {
		ns.Valid = false
	}
	return nil
}

// ToSQL: mengubah ke tipe sql.NullString untuk keperluan GORM
func (ns NullableString) ToSQL() sql.NullString {
	return sql.NullString{
		String: ns.String,
		Valid:  ns.Valid,
	}
}
