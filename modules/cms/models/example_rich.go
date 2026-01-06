package models

import (
	"aldev/modules/global/models"
)

type ExampleRich struct {
	models.BaseModel
	Title       *string `json:"title" gorm:"type:varchar(300)"`
	Slug        *string `json:"slug" gorm:"type:varchar(300);unique;index"`
	Description *string `json:"description,omitempty" gorm:"type:text;omitempty"`
	Image       *string `json:"image,omitempty" gorm:"type:text;omitempty"`
	Content     *string `json:"content,omitempty" gorm:"type:text;omitempty"`
	Galleries   *string `json:"galleries,omitempty" gorm:"type:text;omitempty"`
}
