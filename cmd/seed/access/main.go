package main

import (
	"aldev/connection"
	authModels "aldev/modules/auth/models"
	globalModels "aldev/modules/global/models"
	"aldev/utils"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"gorm.io/gorm"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("❗ Gagal mendapatkan data file .env", err.Error())
	}

	// Init DB
	connection.InitDB()
	db := connection.DB

	// --- Step 1: Scan & Create Permissions ---
	fmt.Println("\n🚀 Memulai Seeding URP Khusus Super Admin...\n")

	files := []string{
		"modules/cms/routes/api.go",
		"modules/auth/routes/api.go",
	}

	acls, err := utils.ScanACLFromFiles(files)
	if err != nil {
		log.Fatal("❌ Gagal scan ACL:", err)
	}

	fmt.Println("🔍 ACL ditemukan:", acls)
	fmt.Printf("📊 Total permission dari routes: %d\n", len(acls))

	var allPermissions []authModels.Permission
	var createdPerms, skippedPerms int

	// Transaction start
	db.Transaction(func(tx *gorm.DB) error {
		// 1. Ensure all permissions exist
		for _, acl := range acls {
			var perm authModels.Permission
			err := tx.Where("name = ?", acl).First(&perm).Error
			if err != nil {
				// Create new
				perm = authModels.Permission{
					Name:        acl,
					Description: strPtr("Can " + acl),
				}
				if err := tx.Create(&perm).Error; err != nil {
					return err
				}
				createdPerms++
			} else {
				skippedPerms++
			}
			allPermissions = append(allPermissions, perm)
		}

		fmt.Printf("\n✅ Permission Sync Selesai: %d created, %d existing\n", createdPerms, skippedPerms)

		// 2. Handle Super Admin Role
		var superAdminRole authModels.Role
		err := tx.Where("name = ?", "Super Admin").First(&superAdminRole).Error
		if err != nil {
			// Create Role if not exists
			superAdminRole = authModels.Role{
				Name:        "Super Admin",
				Description: strPtr("Role dengan akses penuh"),
			}
			if err := tx.Create(&superAdminRole).Error; err != nil {
				return fmt.Errorf("gagal membuat role Super Admin: %v", err)
			}
			fmt.Println("\n✅ Role 'Super Admin' berhasil dibuat")
		} else {
			fmt.Println("\nℹ️ Role 'Super Admin' sudah ada")
		}

		// 3. Assign ALL Permissions to Super Admin Role
		if err := tx.Model(&superAdminRole).Association("Permissions").Replace(allPermissions); err != nil {
			return fmt.Errorf("gagal assign permission ke role Super Admin: %v", err)
		}
		fmt.Printf("✅ %d Permission telah di-assign ke role 'Super Admin'\n", len(allPermissions))

		// 4. Ensure Super Admin User
		var superAdminUser authModels.User
		err = tx.Where("email = ?", "mna.official12@gmail.com").First(&superAdminUser).Error
		if err != nil {
			// Create User
			trueVal := true
			superAdminUser = authModels.User{
				BaseModel: globalModels.BaseModel{
					ID:        uuid.New(),
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				},
				Name:            strPtr("Super Admin"),
				Username:        strPtr("superadmin"),
				Email:           strPtr("mna.official12@gmail.com"),
				Phone:           strPtr("+6289671052050"), // Dummy phone
				CountryCode:     strPtr("ID"),
				RoleID:          &superAdminRole.ID,
				EmailVerifiedAt: &trueVal,
				PhoneVerifiedAt: &trueVal,
			}

			if err := tx.Create(&superAdminUser).Error; err != nil {
				return fmt.Errorf("gagal membuat user Super Admin: %v", err)
			}
			fmt.Println("\n✅ User 'superadmin' berhasil dibuat")
		} else {
			// Update Role ID assurance
			if superAdminUser.RoleID == nil || *superAdminUser.RoleID != superAdminRole.ID {
				superAdminUser.RoleID = &superAdminRole.ID
				if err := tx.Save(&superAdminUser).Error; err != nil {
					return fmt.Errorf("gagal update role user Super Admin: %v", err)
				}
				fmt.Println("\n✅ User 'superadmin' updated dengan Role Super Admin")
			} else {
				fmt.Println("\nℹ️ User 'superadmin' sudah ada dan role sesuai")
			}
		}

		return nil
	})

	separator := strings.Repeat("=", 50)
	fmt.Println("\n" + separator)
	fmt.Println("🎉 SEEDING SELESAI 🎉")
	fmt.Println(separator)
}

func strPtr(s string) *string {
	return &s
}
