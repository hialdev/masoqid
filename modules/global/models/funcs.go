package models

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func All[T any](db *gorm.DB, preload ...string) ([]T, error) {
	var models []T
	for _, p := range preload {
		db = db.Preload(p)
	}
	if err := db.Find(&models).Error; err != nil {
		return nil, err
	}
	return models, nil
}

func Find[T any](db *gorm.DB, id uuid.UUID, preload ...string) (*T, error) {
	var model T
	for _, p := range preload {
		db = db.Preload(p)
	}
	if err := db.First(&model, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &model, nil
}

func FindBy[T any](db *gorm.DB, column string, value any, preload ...string) (*T, error) {
	var model T
	for _, p := range preload {
		db = db.Preload(p)
	}
	if err := db.First(&model, fmt.Sprintf("%s = ?", column), value).Error; err != nil {
		return nil, err
	}
	return &model, nil
}