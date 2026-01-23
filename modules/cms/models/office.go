package models

import (
	"aldev/modules/auth/models"
	globalModels "aldev/modules/global/models"
)

type Office struct {
	globalModels.BaseModel
	Name              string  `json:"name" gorm:"type:varchar(255);not null" validate:"required,min=3,max=255"`
	Description       *string `json:"description,omitempty" gorm:"type:text"`
	Address           string  `json:"address" gorm:"type:text;not null" validate:"required"`
	Latitude          float64 `json:"latitude" gorm:"type:decimal(10,8);not null" validate:"required,min=-90,max=90"`
	Longitude         float64 `json:"longitude" gorm:"type:decimal(11,8);not null" validate:"required,min=-180,max=180"`
	IsStrictRadius    bool    `json:"is_strict_radius" gorm:"default:false"`
	RadiusForCheckin  bool    `json:"radius_for_checkin" gorm:"default:false"`
	RadiusForCheckout bool    `json:"radius_for_checkout" gorm:"default:false"`
	RadiusAllow       float64 `json:"radius_allow" gorm:"type:decimal(10,2);default:100" validate:"required,min=1,max=10000"` // in meters

	// Relasi One-to-Many
	Users []models.User `json:"users,omitempty" gorm:"foreignKey:OfficeID"`
}
