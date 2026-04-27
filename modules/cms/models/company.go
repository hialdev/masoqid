package models

import globalModels "aldev/modules/global/models"

// Company adalah entitas root sistem — hanya bisa diatur oleh Super Admin
type Company struct {
	globalModels.BaseModel
	Logo    *string `json:"logo,omitempty" gorm:"type:text"`
	Name    string  `json:"name" gorm:"type:varchar(255);not null" validate:"required,min=2,max=255"`
	Address string  `json:"address" gorm:"type:text;not null" validate:"required"`
	Phone   string  `json:"phone" gorm:"type:varchar(20);not null" validate:"required"`
	PicName string  `json:"pic_name" gorm:"type:varchar(255);not null" validate:"required"`
	Email   string  `json:"email" gorm:"type:varchar(255);not null;uniqueIndex" validate:"required,email"`
}
