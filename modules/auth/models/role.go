package models

import "aldev/modules/global/models"

type Role struct {
	models.BaseModel
	Name        string  `gorm:"type:varchar(100)" json:"name" validate:"required,min=3"`
	Description *string `gorm:"type:text" json:"description"`

	Permissions []Permission `gorm:"many2many:role_permissions;" json:"permissions,omitempty"`
	Users       []User       `json:"users,omitempty" gorm:"foreignKey:RoleID"`
}
