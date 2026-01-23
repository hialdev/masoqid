package main

import (
	"aldev/connection"
	"aldev/modules/auth/models"
	CMSModels "aldev/modules/cms/models"
	"aldev/routes"
	"aldev/utils"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("❗ Gagal mendapatkan data file .env", err.Error())
	}

	time.LoadLocation(os.Getenv("APP_TIMEZONE"))

	utils.ValidationTranslationInit()

	app := fiber.New()
	// app.Use(cors.New(cors.Config{
	//      AllowOrigins:     "http://localhost:8081, http://localhost:8082",
	//      AllowMethods:     "GET,POST,DELETE",
	//      AllowHeaders:     "Origin,Content-Type,Authorization",
	//      AllowCredentials: true,
	//  }))

	app.Use(cors.New(cors.Config{
		AllowOrigins:     os.Getenv("CORS_ALLOWORIGINS"), //"http://localhost:8082, http://localhost:8000, http://172.245.53.218:8082",
		AllowMethods:     os.Getenv("CORS_ALLOWMETHODS"), //"GET,POST,DELETE,PATCH",
		AllowHeaders:     os.Getenv("CORS_ALLOWHEADERS"), //"Origin,Content-Type,Authorization",
		AllowCredentials: true,
	}))

	connection.InitDB()
	connection.InitRedis()
	connection.InitWAClient()
	err = connection.InitEmail()
	if err != nil {
		log.Fatalf("Email init failed: %v", err)
	}

	//Migration
	connection.DB.AutoMigrate(
		// Auth + RBAC
		&models.Role{},
		&models.Permission{},
		&models.Otp{},

		// CMS - Office must be created first before User (FK constraint)
		&CMSModels.Office{},
		&CMSModels.SettingGroup{},
		&CMSModels.Setting{},
		&CMSModels.ExampleRich{},
		&CMSModels.Attendance{},
		&CMSModels.AttendanceSuspiciousLog{},

		// User last because it has FK to Office
		&models.User{},
	)

	routes.InitRoutes(app, connection.DB)
	app.Static("/uploads", "./uploads")
	app.Listen(":" + os.Getenv("APP_PORT"))
}
