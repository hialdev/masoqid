package connection

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {

	dbDriver := os.Getenv("DB_DRIVER")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")

	if dbHost == "" {
		dbHost = "localhost"
	}
	if dbUser == "" {
		dbUser = "root"
	}
	if dbDriver == "" {
		dbDriver = "mysql" // default
	}

	var dsn string
	var dialector gorm.Dialector

	switch dbDriver {
	case "mysql":
		if dbPort == "" {
			dbPort = "3306"
		}
		dsn = fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			dbUser, dbPassword, dbHost, dbPort, dbName)
		dialector = mysql.Open(dsn)
		fmt.Println("📦 Menggunakan MySQL:", dsn)

	case "postgresql", "postgres":
		if dbPort == "" {
			dbPort = "5432"
		}
		dsn = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			dbHost, dbPort, dbUser, dbPassword, dbName)
		dialector = postgres.Open(dsn)
		fmt.Println("🐘 Menggunakan PostgreSQL:", dsn)

	default:
		log.Fatalf("❌ Unsupported DB_DRIVER: %s. Gunakan 'mysql' atau 'postgresql'", dbDriver)
	}

	db, err := gorm.Open(dialector, &gorm.Config{})
	if err != nil {
		log.Fatalf("💥 Gagal koneksi ke database %s, error: %v", dbDriver, err)
	}

	DB = db

	sqlDB, err := db.DB()
	if err == nil {
		fmt.Println("✅ Connection berhasil:", sqlDB.Stats())
	}
}
