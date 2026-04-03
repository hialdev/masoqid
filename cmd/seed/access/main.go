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

		// 5. Helper: cari permission by name dari allPermissions
		findPerms := func(names []string) []authModels.Permission {
			var result []authModels.Permission
			for _, name := range names {
				for _, p := range allPermissions {
					if p.Name == name {
						result = append(result, p)
						break
					}
				}
			}
			return result
		}

		// 6. Role Manager
		managerPermissions := []string{
			"Read User", "Update User", "Assign User", "Assign Office",
			"Read Office", "Import Office",
			"Read Shift", "Add Shift", "Update Shift", "Delete Shift",
			"Read Salary", "Update User Salary",
			"Read Attendance",
			"Read Setting",
			"Read ExampleRich",
		}

		var managerRole authModels.Role
		if err := tx.Where("name = ?", "Manager").First(&managerRole).Error; err != nil {
			managerRole = authModels.Role{
				Name:        "Manager",
				Description: strPtr("Akses manajemen karyawan, shift, dan laporan"),
			}
			if err := tx.Create(&managerRole).Error; err != nil {
				return fmt.Errorf("gagal membuat role Manager: %v", err)
			}
			fmt.Println("\n✅ Role 'Manager' berhasil dibuat")
		} else {
			fmt.Println("\nℹ️ Role 'Manager' sudah ada")
		}
		if err := tx.Model(&managerRole).Association("Permissions").Replace(findPerms(managerPermissions)); err != nil {
			return fmt.Errorf("gagal assign permission ke Manager: %v", err)
		}
		fmt.Printf("✅ %d permission di-assign ke role 'Manager'\n", len(managerPermissions))

		// 7. Role Karyawan (tidak ada permission ACL — akses via JWT-only endpoints)
		var karyawanRole authModels.Role
		if err := tx.Where("name = ?", "Karyawan").First(&karyawanRole).Error; err != nil {
			karyawanRole = authModels.Role{
				Name:        "Karyawan",
				Description: strPtr("Akses terbatas: lihat shift sendiri dan absensi sendiri"),
			}
			if err := tx.Create(&karyawanRole).Error; err != nil {
				return fmt.Errorf("gagal membuat role Karyawan: %v", err)
			}
			fmt.Println("\n✅ Role 'Karyawan' berhasil dibuat")
		} else {
			fmt.Println("\nℹ️ Role 'Karyawan' sudah ada")
		}
		// Karyawan tidak perlu permission ACL — my-shifts, my-attendance, profile cukup JWT
		fmt.Println("ℹ️ Role 'Karyawan' tidak memiliki permission ACL (akses via JWT-only endpoints)")

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
