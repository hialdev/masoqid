package main

import (
	"aldev/connection"
	"aldev/modules/auth/models"
	"aldev/utils"
	"fmt"
	"log"

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

	// --- Step 2: Seed permissions otomatis ---
	for _, acl := range acls {
		var existing models.Permission
		err := db.Where("name = ?", acl).First(&existing).Error

		if err != nil {
			p := models.Permission{
				Name:        acl,
				Description: strPtr("Can " + acl),
			}
			db.Create(&p)
			fmt.Println("➕ Permission ditambahkan:", acl)
		}
	}

	fmt.Println("✅ Permissions seeded dari route")

	// --- Step 3: Create Super Admin Role ---
	var superAdmin models.Role
	err = db.Where("name = ?", "Super Admin").First(&superAdmin).Error
	if err != nil {
		superAdmin = models.Role{
			Name:        "Super Admin",
			Description: strPtr("Full system access"),
		}
		db.Create(&superAdmin)
		fmt.Println("🏷️  Role Super Admin dibuat")
	}

	// Attach semua permission ke Super Admin
	var allPermissions []models.Permission
	db.Find(&allPermissions)
	db.Model(&superAdmin).Association("Permissions").Replace(allPermissions)

	fmt.Println("🔗 Semua permission terhubung ke Super Admin")

	// --- Step 4: Create Super Admin User ---
	var user models.User
	err = db.Where("username = ?", "hialdev").First(&user).Error
	if err != nil {
		user = models.User{
			Name:     strPtr("Hi AL Dev"),
			Username: strPtr("hialdev"),
			Email:    strPtr("mna.official12@gmail.com"),
			Phone:    strPtr("+6289671052050"),
			RoleID:   &superAdmin.ID,
		}

		db.Create(&user)
		fmt.Println("👑 Super Admin user dibuat: hialdev")
	} else {
		fmt.Println("ℹ️  Super Admin user sudah ada")
	}

	fmt.Println("🎉 Seeding complete!")
}

func strPtr(s string) *string {
	return &s
}
