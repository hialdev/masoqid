package main

import (
	"aldev/connection"
	"aldev/modules/auth/models"
	"aldev/utils"
	"fmt"
	"log"
	"strings"

	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("❗ Gagal mendapatkan data file .env", err.Error())
	}

	// Init DB
	connection.InitDB()
	db := connection.DB

	// --- Step 1: Scan ACL dari file route ---
	files := []string{
		"modules/cms/routes/api.go",
		"modules/auth/routes/api.go",
	}

	acls, err := utils.ScanACLFromFiles(files)
	if err != nil {
		log.Fatal("❌ Gagal scan ACL:", err)
	}

	fmt.Println("🔍 ACL ditemukan:", acls)
	fmt.Printf("📊 Total: %d permissions\n\n", len(acls))

	// --- Step 2: Seed/Update permissions otomatis ---
	var created, skipped int

	for _, acl := range acls {
		var existing models.Permission
		err := db.Where("name = ?", acl).First(&existing).Error

		if err != nil {
			// Permission belum ada, buat baru
			p := models.Permission{
				Name:        acl,
				Description: strPtr("Can " + acl),
			}
			if err := db.Create(&p).Error; err != nil {
				fmt.Printf("❌ Gagal membuat permission '%s': %v\n", acl, err)
				continue
			}
			fmt.Printf("➕ Permission ditambahkan: %s\n", acl)
			created++
		} else {
			// Permission sudah ada, skip
			fmt.Printf("⏭️  Permission sudah ada: %s\n", acl)
			skipped++
		}
	}

	separator := strings.Repeat("=", 50)
	fmt.Println("\n" + separator)
	fmt.Printf("✅ Seeding permissions selesai!\n")
	fmt.Printf("📈 Statistik:\n")
	fmt.Printf("   - Ditambahkan: %d permissions\n", created)
	fmt.Printf("   - Dilewati (sudah ada): %d permissions\n", skipped)
	fmt.Printf("   - Total: %d permissions\n", len(acls))
	fmt.Println(separator)
}

func strPtr(s string) *string {
	return &s
}
