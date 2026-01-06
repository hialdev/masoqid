package models

import "aldev/modules/global/models"

type Permission struct {
	models.BaseModel
	Name        string  `gorm:"type:varchar(100)" json:"name" validate:"required,min=3"`
	Description *string `gorm:"type:text" json:"description" validate:"omitempty"`
}
