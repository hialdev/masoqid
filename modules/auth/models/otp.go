package models

import (
	"aldev/modules/global/models"
	"errors"
	"time"

	"github.com/go-playground/validator/v10"
	"gorm.io/gorm"
)

// Otp struct
type Otp struct {
	models.BaseModel
	Phone     *string   `json:"phone" validate:"omitempty,min=6,max=14"`
	Email     *string   `json:"email" validate:"omitempty,email"`
	IsEmail   bool      `json:"is_email"`
	Code      string    `json:"code" gorm:"unique" validate:"required,len=6"`
	ExpiredAt time.Time `json:"expired_at"`
	Purpose   string    `json:"purpose" validate:"oneof=register changes verify login"`
}

// TableName override
func (Otp) TableName() string {
	return "otp"
}

// global validator instance
var validate = validator.New()

// BeforeCreate hook - HARUS memanggil BaseModel.BeforeCreate terlebih dahulu
func (o *Otp) BeforeCreate(tx *gorm.DB) (err error) {
	// 1. Panggil BaseModel.BeforeCreate untuk generate UUID
	if err = o.BaseModel.BeforeCreate(tx); err != nil {
		return err
	}

	// 2. Jalankan go-playground validator
	if err = validate.Struct(o); err != nil {
		return err
	}

	// 3. Custom validation: salah satu harus ada (email atau phone)
	if (o.Email == nil || *o.Email == "") && (o.Phone == nil || *o.Phone == "") {
		return errors.New("either email or phone must be provided")
	}

	return nil
}

// BeforeUpdate hook
func (o *Otp) BeforeUpdate(tx *gorm.DB) (err error) {
	// Jalankan go-playground validator
	if err = validate.Struct(o); err != nil {
		return err
	}

	// Custom validation: salah satu harus ada
	if (o.Email == nil || *o.Email == "") && (o.Phone == nil || *o.Phone == "") {
		return errors.New("either email or phone must be provided")
	}

	return nil
}
