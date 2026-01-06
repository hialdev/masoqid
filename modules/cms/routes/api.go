package routes

import (
	"aldev/modules/cms/handlers"
	"aldev/routes/middlewares"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func SetupCMSRoutes(app *fiber.App, db *gorm.DB) {
	api := app.Group("/api")

	set_group := handlers.NewSettingGroupHandler(db)
	sgroup := api.Group("/setting-groups")
	sgroup.Use(middlewares.JWTProtected())
	sgroup.Use(middlewares.DoACL("Read Setting")).Get("/", set_group.GetAllSettingGroups)
	sgroup.Use(middlewares.DoACL("Read Setting")).Get("/:id", set_group.GetSettingGroup)
	sgroup.Use(middlewares.DoACL("Add Setting")).Post("/", set_group.CreateSettingGroup)
	sgroup.Use(middlewares.DoACL("Update Setting")).Patch("/:id", set_group.UpdateSettingGroup)
	sgroup.Use(middlewares.DoACL("Delete Setting")).Delete("/:id", set_group.DeleteSettingGroup)

	settings := handlers.NewSettingHandler(db)
	setting := api.Group("/settings")
	setting.Get("/key/:key", settings.GetSettingByKey)
	setting.Use(middlewares.JWTProtected())
	setting.Use(middlewares.DoACL("Add Setting")).Post("/", settings.AddSetting)
	setting.Use(middlewares.DoACL("Update Setting")).Post("/:id/value", settings.ValueSetting)
	setting.Use(middlewares.DoACL("Update Setting")).Patch("/:id", settings.UpdateSetting)
	setting.Use(middlewares.DoACL("Read Setting")).Get("/:id", settings.GetSetting)
	setting.Use(middlewares.DoACL("Delete Setting")).Delete("/:id", settings.DeleteSetting)

	// Example Rich Handler routes
	exampleRichs := handlers.NewExampleRichHandler(db)
	exampleRich := api.Group("/example-rich")
	exampleRich.Use(middlewares.JWTProtected())
	exampleRich.Use(middlewares.DoACL("Read ExampleRich")).Get("/", exampleRichs.GetAllExampleRichHandlers)
	exampleRich.Use(middlewares.DoACL("Read ExampleRich")).Get("/:id", exampleRichs.GetExampleRichHandler)
	exampleRich.Use(middlewares.DoACL("Add ExampleRich")).Post("/", exampleRichs.AddExampleRichHandler)
	exampleRich.Use(middlewares.DoACL("Update ExampleRich")).Post("/:id", exampleRichs.UpdateExampleRichHandler)
	exampleRich.Use(middlewares.DoACL("Delete ExampleRich")).Delete("/:id", exampleRichs.DeleteExampleRichHandler)

	// Attendance Routes
	attHandler := handlers.NewAttendanceHandler(db)

	// Employee Actions
	attendanceGroup := api.Group("/attendance")
	attendanceGroup.Use(middlewares.JWTProtected())
	attendanceGroup.Post("/check-in", attHandler.CheckIn)
	attendanceGroup.Post("/check-out", attHandler.CheckOut)
	attendanceGroup.Get("/", middlewares.DoACL("Read Attendance"), attHandler.GetAllAttendance) // GET /attendance

	// My Attendance
	api.Get("/my-attendance", middlewares.JWTProtected(), attHandler.GetMyAttendance)
}
