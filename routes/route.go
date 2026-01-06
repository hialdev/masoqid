package routes

import (
	"aldev/modules/auth/routes"
	cmsRoutes "aldev/modules/cms/routes"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func InitRoutes(app *fiber.App, db *gorm.DB) {
	routes.SetupAuthRoutes(app, db)
	cmsRoutes.SetupCMSRoutes(app, db)
}
