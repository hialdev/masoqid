package models

import (
	"aldev/modules/global/models"

	"github.com/google/uuid"
)

type User struct {
	models.BaseModel
	CountryCode     *string    `json:"country_code" gorm:"omitempty" validate:"required,min=2,max=3"`
	Name            *string    `json:"name" gorm:"omitempty" validate:"required,min=2,max=20"`
	Username        *string    `json:"username" gorm:"omitempty;unique" validate:"required,min=4,max=12"`
	Email           *string    `json:"email" gorm:"unique" validate:"required,unique,min=4,max=50"`
	EmailVerifiedAt *bool      `json:"email_verified_at,omitempty" validate:"omitempty,boolean"`
	Phone           *string    `json:"phone" gorm:"unique" validate:"required,unique,min=4,max=16"`
	PhoneVerifiedAt *bool      `json:"phone_verified_at,omitempty" validate:"omitempty,boolean"`
	Image           *string    `json:"image" gorm:"text;omitempty"`
	RoleID          *uuid.UUID `json:"role_id,omitempty"`

	Role Role `json:"role,omitempty" gorm:"foreignKey:RoleID;constraint:SET NULL;"`
}
