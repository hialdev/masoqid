package models

import (
	authModels "aldev/modules/auth/models"
	globalModels "aldev/modules/global/models"
	"github.com/google/uuid"
)

// ShiftLog tracks any changes made to a shift (updates, switches, etc.)
type ShiftLog struct {
	globalModels.BaseModel
	ShiftID    uuid.UUID  `json:"shift_id" gorm:"type:char(36);not null;index"`
	Type       string     `json:"type" gorm:"type:varchar(50)"` // 'update', 'switch', 'delete'
	
	// Track User change
	OldUserID  *uuid.UUID `json:"old_user_id,omitempty" gorm:"type:char(36)"`
	NewUserID  *uuid.UUID `json:"new_user_id,omitempty" gorm:"type:char(36)"`
	
	// Track Time change
	OldStartTime string `json:"old_start_time,omitempty"`
	NewStartTime string `json:"new_start_time,omitempty"`
	OldEndTime   string `json:"old_end_time,omitempty"`
	NewEndTime   string `json:"new_end_time,omitempty"`
	OldDate      string `json:"old_date,omitempty"`
	NewDate      string `json:"new_date,omitempty"`

	ChangedBy  uuid.UUID  `json:"changed_by" gorm:"type:char(36);not null"`
	Reason     string     `json:"reason" gorm:"type:text"`

	// Relationships
	Shift    Shift            `json:"shift" gorm:"foreignKey:ShiftID"`
	OldUser  *authModels.User `json:"old_user" gorm:"foreignKey:OldUserID"`
	NewUser  *authModels.User `json:"new_user" gorm:"foreignKey:NewUserID"`
	Modifier authModels.User  `json:"modifier" gorm:"foreignKey:ChangedBy"`
}
