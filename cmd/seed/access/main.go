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

	connection.InitDB()
	db := connection.DB

	fmt.Println("\n🚀 Memulai Seeding Roles & Permissions...\n")

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

	db.Transaction(func(tx *gorm.DB) error {
		// ────────────────────────────────────────────────
		// 1. Sync semua permissions dari routes
		// ────────────────────────────────────────────────
		for _, acl := range acls {
			var perm authModels.Permission
			err := tx.Where("name = ?", acl).First(&perm).Error
			if err != nil {
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

		// Helper: cari permission by name dari allPermissions
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

		// ────────────────────────────────────────────────
		// 2. ROLE: Super Admin — all permissions
		// ────────────────────────────────────────────────
		var superAdminRole authModels.Role
		if err := tx.Where("name = ?", "Super Admin").First(&superAdminRole).Error; err != nil {
			superAdminRole = authModels.Role{
				Name:        "Super Admin",
				Description: strPtr("Developer / System Administrator dengan akses penuh"),
			}
			tx.Create(&superAdminRole)
			fmt.Println("\n✅ Role 'Super Admin' berhasil dibuat")
		} else {
			fmt.Println("\nℹ️ Role 'Super Admin' sudah ada")
		}
		tx.Model(&superAdminRole).Association("Permissions").Replace(allPermissions)
		fmt.Printf("✅ %d Permission di-assign ke 'Super Admin'\n", len(allPermissions))

		// Ensure Super Admin user
		var superAdminUser authModels.User
		if err := tx.Where("email = ?", "mna.official12@gmail.com").First(&superAdminUser).Error; err != nil {
			trueVal := true
			superAdminUser = authModels.User{
				BaseModel:       globalModels.BaseModel{ID: uuid.New(), CreatedAt: time.Now(), UpdatedAt: time.Now()},
				Name:            strPtr("Super Admin"),
				Username:        strPtr("superadmin"),
				Email:           strPtr("mna.official12@gmail.com"),
				Phone:           strPtr("+6289671052050"),
				CountryCode:     strPtr("ID"),
				RoleID:          &superAdminRole.ID,
				EmailVerifiedAt: &trueVal,
				PhoneVerifiedAt: &trueVal,
			}
			tx.Create(&superAdminUser)
			fmt.Println("✅ User 'superadmin' berhasil dibuat")
		} else {
			if superAdminUser.RoleID == nil || *superAdminUser.RoleID != superAdminRole.ID {
				tx.Model(&superAdminUser).Update("role_id", superAdminRole.ID)
				fmt.Println("✅ User 'superadmin' role diperbarui")
			} else {
				fmt.Println("ℹ️ User 'superadmin' sudah ada dan role sesuai")
			}
		}

		// ────────────────────────────────────────────────
		// 3. ROLE: Company Owner
		// ────────────────────────────────────────────────
		companyOwnerPermissions := []string{
			// Company management
			"Read Company",
			// Office management
			"Read Office", "Add Office", "Update Office", "Delete Office", "Import Office", "Assign Office",
			// Employee / Profile management
			"Read Employee", "Add Employee", "Update Employee", "Delete Employee",
			// Shift management
			"Read Shift", "Add Shift", "Update Shift", "Delete Shift",
			// Attendance
			"Read Attendance",
			// Shift Switch (approve/reject)
			"Read Shift Switch", "Approve Shift Switch", "Reject Shift Switch",
			// Salary
			"Read Salary", "Update User Salary",
			// User access (assign as Office Manager)
			"Read User", "Update User", "Assign User", "Assign Office",
			// Settings (read only)
			"Read Setting",
		}

		var companyOwnerRole authModels.Role
		if err := tx.Where("name = ?", "Company Owner").First(&companyOwnerRole).Error; err != nil {
			companyOwnerRole = authModels.Role{
				Name:        "Company Owner",
				Description: strPtr("Pemilik perusahaan — kelola semua office dan karyawan"),
			}
			tx.Create(&companyOwnerRole)
			fmt.Println("\n✅ Role 'Company Owner' berhasil dibuat")
		} else {
			fmt.Println("\nℹ️ Role 'Company Owner' sudah ada")
		}
		coPerms := findPerms(companyOwnerPermissions)
		tx.Model(&companyOwnerRole).Association("Permissions").Replace(coPerms)
		fmt.Printf("✅ %d permission di-assign ke 'Company Owner'\n", len(coPerms))

		// ────────────────────────────────────────────────
		// 4. ROLE: Office Manager
		// ────────────────────────────────────────────────
		officeManagerPermissions := []string{
			// Company
			"Read Company",
			// Office
			"Read Office", "Import Office", "Assign Office",
			// Employee
			"Read Employee", "Add Employee", "Update Employee", "Delete Employee",
			// Shift management
			"Read Shift", "Add Shift", "Update Shift", "Delete Shift",
			// Attendance
			"Read Attendance",
			// Shift Switch (approve/reject)
			"Read Shift Switch", "Approve Shift Switch", "Reject Shift Switch",
			// Salary
			"Read Salary",
			// Settings
			"Read Setting",
		}

		var officeManagerRole authModels.Role
		// Jika masih ada role "Manager" lama, rename ke "Office Manager"
		var oldManagerRole authModels.Role
		if err := tx.Where("name = ?", "Manager").First(&oldManagerRole).Error; err == nil {
			tx.Model(&oldManagerRole).Update("name", "Office Manager")
			tx.Model(&oldManagerRole).Update("description", "Manager satu office — kelola karyawan dan shift di office-nya")
			officeManagerRole = oldManagerRole
			fmt.Println("ℹ️ Role 'Manager' diubah nama menjadi 'Office Manager'")
		} else if err := tx.Where("name = ?", "Office Manager").First(&officeManagerRole).Error; err != nil {
			officeManagerRole = authModels.Role{
				Name:        "Office Manager",
				Description: strPtr("Manager satu office — kelola karyawan dan shift di office-nya"),
			}
			tx.Create(&officeManagerRole)
			fmt.Println("✅ Role 'Office Manager' berhasil dibuat")
		} else {
			fmt.Println("ℹ️ Role 'Office Manager' sudah ada")
		}
		omPerms := findPerms(officeManagerPermissions)
		tx.Model(&officeManagerRole).Association("Permissions").Replace(omPerms)
		fmt.Printf("✅ %d permission di-assign ke 'Office Manager'\n", len(omPerms))

		// ────────────────────────────────────────────────
		// 5. ROLE: Karyawan / Employee — no ACL permissions
		//    Akses via JWT-only endpoints: /my-attendance,
		//    /my-shifts, /my-profile, /my-shift-switch-requests
		// ────────────────────────────────────────────────
		var karyawanRole authModels.Role
		if err := tx.Where("name = ?", "Karyawan").First(&karyawanRole).Error; err != nil {
			karyawanRole = authModels.Role{
				Name:        "Karyawan",
				Description: strPtr("Karyawan — akses terbatas: absensi, shift, dan profil sendiri"),
			}
			tx.Create(&karyawanRole)
			fmt.Println("\n✅ Role 'Karyawan' berhasil dibuat")
		} else {
			fmt.Println("\nℹ️ Role 'Karyawan' sudah ada")
		}
		// Clear any old permissions
		tx.Model(&karyawanRole).Association("Permissions").Clear()
		fmt.Println("ℹ️ Role 'Karyawan' tidak memiliki permission ACL (akses via JWT-only endpoints)")

		return nil
	})

	separator := strings.Repeat("=", 50)
	fmt.Println("\n" + separator)
	fmt.Println("🎉 SEEDING SELESAI 🎉")
	fmt.Println(separator)
	fmt.Println("\nRoles yang aktif:")
	fmt.Println("  1. Super Admin     → All Access")
	fmt.Println("  2. Company Owner   → Office, Employee, Shift, Attendance, Reports")
	fmt.Println("  3. Office Manager  → Employee, Shift, Attendance (scope 1 office)")
	fmt.Println("  4. Karyawan        → JWT-only: my-attendance, my-shifts, my-profile")
}

func strPtr(s string) *string {
	return &s
}
