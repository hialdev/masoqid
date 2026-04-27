package models

import (
	authModels "aldev/modules/auth/models"
	globalModels "aldev/modules/global/models"

	"github.com/google/uuid"
)

// Profile adalah data extended karyawan (NIK, NIP, NPWP, dll)
// Relasi 1:1 dengan User
type Profile struct {
	globalModels.BaseModel
	UserID    uuid.UUID  `json:"user_id" gorm:"type:char(36);not null;uniqueIndex"`
	NIK       string     `json:"nik" gorm:"type:varchar(20)" validate:"required"`
	NIP       *string    `json:"nip,omitempty" gorm:"type:varchar(20)"`
	NPWP      *string    `json:"npwp,omitempty" gorm:"type:varchar(20)"`
	Address   string     `json:"address" gorm:"type:text" validate:"required"`
	OfficeID  *uuid.UUID `json:"office_id,omitempty" gorm:"type:char(36);index"`
	CompanyID *uuid.UUID `json:"company_id,omitempty" gorm:"type:char(36);index"`

	// Relasi
	User    authModels.User `json:"user,omitempty" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE;"`
	Office  *Office         `json:"office,omitempty" gorm:"foreignKey:OfficeID;constraint:OnDelete:SET NULL;"`
	Company *Company        `json:"company,omitempty" gorm:"foreignKey:CompanyID;constraint:OnDelete:SET NULL;"`
}
