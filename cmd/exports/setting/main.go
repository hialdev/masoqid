package main

import (
	"aldev/connection"
	cmsModels "aldev/modules/cms/models"

	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

type ExportSetting struct {
	Name       string  `json:"name"`
	SetKey     string  `json:"set_key"`
	SetValue   *string `json:"set_value"`
	SetType    string  `json:"set_type"`
	SetOptions *string `json:"set_options"`
	IsUrgent   bool    `json:"is_urgent"`
}

type ExportSettingGroup struct {
	Name        string          `json:"name"`
	Description *string         `json:"description"`
	Icon        *string         `json:"icon"`
	Settings    []ExportSetting `json:"settings"`
}

func main() {

	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Fatal("Gagal load .env:", err)
	}

	// Init DB
	connection.InitDB()
	db := connection.DB

	var groups []cmsModels.SettingGroup
	db.Preload("Settings").Find(&groups)

	exportData := []ExportSettingGroup{}

	for _, g := range groups {

		eg := ExportSettingGroup{
			Name:        g.Name,
			Description: g.Description,
			Icon:        g.Icon,
		}

		for _, s := range g.Settings {
			eg.Settings = append(eg.Settings, ExportSetting{
				Name:       s.Name,
				SetKey:     s.SetKey,
				SetValue:   s.SetValue,
				SetType:    s.SetType,
				SetOptions: s.SetOptions,
				IsUrgent:   s.IsUrgent,
			})
		}

		exportData = append(exportData, eg)
	}

	jsonBytes, _ := json.MarshalIndent(exportData, "", "  ")
	_ = os.WriteFile("cmd/exports/setting/output.json", jsonBytes, 0644)

	fmt.Println("✅ Export selesai → cmd/exports/setting/output.json")
}
