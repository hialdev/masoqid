package main

import (
	"aldev/connection"
	cmsModels "aldev/modules/cms/models"

	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
)

type SeedSetting struct {
	Name        string  `json:"name"`
	SetKey      string  `json:"set_key"`
	SetValue    *string `json:"set_value"`
	SetType     string  `json:"set_type"`
	SetOptions  *string `json:"set_options"`
	IsUrgent    bool    `json:"is_urgent"`
}

type SeedGroup struct {
	Name        string        `json:"name"`
	Description *string       `json:"description"`
	Icon        *string       `json:"icon"`
	Settings    []SeedSetting `json:"settings"`
}

func main() {

	godotenv.Load()
	connection.InitDB()
	db := connection.DB

	// Load file JSON
	data, err := os.ReadFile("cmd/exports/setting/output.json")
	if err != nil {
		log.Fatal("Gagal membaca cmd/exports/setting/output.json:", err)
	}

	var items []SeedGroup
	_ = json.Unmarshal(data, &items)

	for _, grp := range items {

		// --- 1. Insert GROUP kalau belum ada
		var group cmsModels.SettingGroup
		err := db.Where("name = ?", grp.Name).First(&group).Error
		if err != nil {
			group = cmsModels.SettingGroup{
				Name:        grp.Name,
				Description: grp.Description,
				Icon:        grp.Icon,
			}
			db.Create(&group)
		}

		// --- 2. Loop SETTINGS
		for _, s := range grp.Settings {

			var setting cmsModels.Setting
			err := db.Where("set_key = ?", s.SetKey).First(&setting).Error
			if err == nil {
				continue // sudah ada → skip
			}

			db.Create(&cmsModels.Setting{
				Name:       s.Name,
				SetKey:     s.SetKey,
				SetValue:   s.SetValue,
				SetType:    s.SetType,
				SetOptions: s.SetOptions,
				IsUrgent:   s.IsUrgent,
				GroupID:    uuid.UUID(group.ID),
			})
		}
	}

	fmt.Println("🎉 Setting berhasil diseed!")
}
