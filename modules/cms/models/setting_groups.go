package models

import "aldev/modules/global/models"

type SettingGroup struct {
	models.BaseModel
	Name        string  `json:"name" gorm:"type:varchar(300)"`
	Description *string `json:"description,omitempty" gorm:"type:text;omitempty"`
	Icon        *string `json:"icon,omitempty" gorm:"type:varchar(100);omitempty" validate:"omitempty"`

	Settings []Setting `json:"settings,omitempty" gorm:"foreignKey:GroupID"`
}
