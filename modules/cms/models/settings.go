package models

import (
	"aldev/modules/global/models"

	"github.com/google/uuid"
)

type Setting struct {
	models.BaseModel
	Name        string       `json:"name" gorm:"type:varchar(300)"`
	Description *string      `json:"description,omitempty" gorm:"type:text;omitempty"`
	SetKey      string       `json:"set_key" gorm:"type:varchar(100);" validate:"required"`
	SetValue    *string      `json:"set_value"`
	SetType     string       `json:"set_type" gorm:"type:varchar(100);default:'text'" validate:"oneof=text number checkbox radio select selects file image files images richtext markdown"`
	SetOptions  *string      `json:"set_options" gorm:"type:text;omitempty" validate:"omitempty"`
	IsUrgent    bool         `json:"is_urgent" gorm:"type:bool;default:false"`
	GroupID     uuid.UUID    `json:"group_id" gorm:"not null;index"`
}
