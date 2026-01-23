package models

import (
	"aldev/modules/global/models"
	"time"

	"github.com/google/uuid"
)

type Attendance struct {
	models.BaseModel
	UserID           uuid.UUID  `json:"user_id" gorm:"type:char(36);index"`
	UserName         string     `json:"user_name" gorm:"->"`                            // Read-only from join
	OfficeID         *uuid.UUID `json:"office_id,omitempty" gorm:"type:char(36);index"` // Office relation
	AttendanceType   string     `json:"attendance_type" gorm:"type:varchar(50)"`        // CHECK_IN, CHECK_OUT
	AttendanceTime   time.Time  `json:"attendance_time"`
	Latitude         float64    `json:"latitude"`
	Longitude        float64    `json:"longitude"`
	LocationAccuracy float64    `json:"location_accuracy"`
	PhotoURL         string     `json:"photo_url" gorm:"type:text"`
	PhotoHash        string     `json:"photo_hash" gorm:"type:varchar(255);index"`
	Attachments      *string    `json:"attachments" gorm:"type:text"` // stringify array
	IPAddress        string     `json:"ip_address" gorm:"type:varchar(50)"`
	UserAgent        string     `json:"user_agent" gorm:"type:text"`
	Status           string     `json:"status" gorm:"type:varchar(50)"` // VALID, SUSPICIOUS, INVALID
	SuspiciousScore  int        `json:"suspicious_score"`

	SuspiciousLogs []AttendanceSuspiciousLog `json:"suspicious_logs" gorm:"foreignKey:AttendanceID"`
	User           interface{}               `json:"user" gorm:"-"` // Placeholder for user detail if needed
}

type AttendanceSuspiciousLog struct {
	models.BaseModel
	AttendanceID    uuid.UUID `json:"attendance_id" gorm:"type:char(36);index"`
	RuleCode        string    `json:"rule_code" gorm:"type:varchar(100)"`
	RuleDescription string    `json:"rule_description" gorm:"type:text"`
	Score           int       `json:"score"`
}
