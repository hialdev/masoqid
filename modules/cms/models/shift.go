package models

import (
	globalModels "aldev/modules/global/models"
	"time"

	"github.com/google/uuid"
)

type Shift struct {
	globalModels.BaseModel
	UserID    uuid.UUID  `json:"user_id" gorm:"type:char(36);not null;index"`
	OfficeID  *uuid.UUID `json:"office_id,omitempty" gorm:"type:char(36);index"`
	Date      time.Time  `json:"date" gorm:"type:date;not null;index"`
	StartTime string     `json:"start_time" gorm:"type:varchar(5);not null"`
	EndTime   string     `json:"end_time" gorm:"type:varchar(5);not null"`
	Note      *string    `json:"note,omitempty" gorm:"type:text"`

	// Populated manually (avoid circular import)
	User interface{} `json:"user,omitempty" gorm:"-"`
}
