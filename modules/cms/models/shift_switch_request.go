package models

import (
	authModels "aldev/modules/auth/models"
	globalModels "aldev/modules/global/models"
	"time"

	"github.com/google/uuid"
)

// ShiftSwitchRequest — permintaan tukar shift antar karyawan
// Status: pending → approved / rejected
type ShiftSwitchRequest struct {
	globalModels.BaseModel
	RequesterID      uuid.UUID  `json:"requester_id" gorm:"type:char(36);not null;index"`
	TargetID         uuid.UUID  `json:"target_id" gorm:"type:char(36);not null;index"`
	RequesterShiftID uuid.UUID  `json:"requester_shift_id" gorm:"type:char(36);not null"`
	TargetShiftID    uuid.UUID  `json:"target_shift_id" gorm:"type:char(36);not null"`
	Status           string     `json:"status" gorm:"type:varchar(20);default:'pending'"` // pending|approved|rejected
	Reason           *string    `json:"reason,omitempty" gorm:"type:text"`
	ReviewNote       *string    `json:"review_note,omitempty" gorm:"type:text"`
	ReviewedBy       *uuid.UUID `json:"reviewed_by,omitempty" gorm:"type:char(36);index"`
	ReviewedAt       *time.Time `json:"reviewed_at,omitempty"`

	// Relationships
	Requester      authModels.User  `json:"requester" gorm:"foreignKey:RequesterID"`
	Target         authModels.User  `json:"target" gorm:"foreignKey:TargetID"`
	RequesterShift Shift            `json:"requester_shift" gorm:"foreignKey:RequesterShiftID"`
	TargetShift    Shift            `json:"target_shift" gorm:"foreignKey:TargetShiftID"`
	Reviewer       *authModels.User `json:"reviewer" gorm:"foreignKey:ReviewedBy"`
}
