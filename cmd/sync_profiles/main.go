package main

import (
	"aldev/connection"
	authModels "aldev/modules/auth/models"
	cmsModels "aldev/modules/cms/models"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	connection.InitDB()
	db := connection.DB

	fmt.Println("🚀 Starting Sync Profiles to Users...")

	var profiles []cmsModels.Profile
	if err := db.Find(&profiles).Error; err != nil {
		log.Fatalf("Failed to fetch profiles: %v", err)
	}

	fmt.Printf("Found %d profiles to sync\n", len(profiles))

	count := 0
	for _, p := range profiles {
		result := db.Model(&authModels.User{}).Where("id = ?", p.UserID).Updates(map[string]interface{}{
			"office_id":  p.OfficeID,
			"company_id": p.CompanyID,
		})
		if result.Error != nil {
			fmt.Printf("❌ Error syncing user %s: %v\n", p.UserID, result.Error)
		} else if result.RowsAffected > 0 {
			count++
		}
	}

	fmt.Printf("✅ Sync finished. %d users updated.\n", count)
	os.Exit(0)
}
