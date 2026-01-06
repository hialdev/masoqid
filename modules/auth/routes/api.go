package routes

import (
	"aldev/connection"
	"aldev/modules/auth/handlers"
	"aldev/modules/auth/models"
	"aldev/modules/auth/services"
	globalHandler "aldev/modules/global/handlers"
	"aldev/routes/middlewares"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"gorm.io/gorm"
)

func SetupAuthRoutes(app *fiber.App, db *gorm.DB) {

	api := app.Group("/api")
	api.Get("/auth/test", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success": true,
			"message": "Auth API is running",
		})
	})

	ws := app.Group("/ws")

	// -------------- Whatsapp Websocket Routes
	wa := ws.Group("/wa")
	wa.Get("/connection", websocket.New(handlers.WAHandler))
	wa.Post("/send", handlers.SendMessageHandler)
	wa.Post("/check", handlers.CheckNumberHandler)
	wa.Get("/status", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success":   true,
			"message":   "WhatsApp API is running",
			"connected": connection.IsConnected(),
			"user_id":   connection.GetUserID(),
		})
	})

	// -------------- Auth Routes
	otpHandler := handlers.OtpHandler{DB: db}
	otp := api.Group("/otp")
	otp.Post("/request", otpHandler.SendOTP)
	otp.Post("/request-change", otpHandler.ChangeSecurityOTP)
	otp.Post("/validate", otpHandler.ValidateOTP)

	auth := handlers.NewAuthHandler(services.NewAuthService(db))
	api.Post("/auth/me/:id", auth.CheckUserExist)
	api.Post("/checkuser", auth.CheckRegistered)
	api.Post("/auth/register", auth.Register)
	api.Post("/auth/login", auth.Login)
	api.Post("/auth/refresh", auth.RefreshToken)

	protected := api.Group("/auth")
	protected.Use(middlewares.JWTProtected())
	protected.Post("/checktoken", auth.CheckAccessToken)
	protected.Post("/logout", auth.Logout)

	// --------------- Profile Routes
	profile := handlers.NewProfileHandler(db)
	pf := api.Group("/profile")
	pf.Use(middlewares.JWTProtected())
	pf.Get("/", profile.Get)
	pf.Post("/change", profile.UpdateBasic)
	pf.Post("/change/email", profile.UpdateEmail)
	pf.Post("/change/phone", profile.UpdatePhone)

	// -------------- Access Control list Routes
	userHandler := handlers.NewUserHandler(db)
	usr := api.Group("/users")
	usr.Use(middlewares.JWTProtected())
	usr.Get("/", userHandler.GetUsers)
	usr.Delete("/:id", userHandler.Delete)
	usr.Post("/", userHandler.Create)
	usr.Use(middlewares.DoACL("Update User")).Post("/:id", userHandler.Update)
	usr.Use(middlewares.DoACL("Read User")).Get("/:id", userHandler.GetUser)
	usr.Use(middlewares.DoACL("Assign User")).Post("/:id/assign", userHandler.AssignRole)

	roles := handlers.NewRoleHandler(db)
	rl := api.Group("/roles")
	rl.Use(middlewares.JWTProtected())
	rl.Get("/", roles.GetRoles)
	rl.Get("/:id", roles.GetRole)
	rl.Post("/", roles.CreateRole)
	rl.Patch("/:id", roles.UpdateRole)
	rl.Delete("/:id", roles.DeleteRole)

	permissions := globalHandler.NewHandlerGeneric[models.Permission](db)
	pm := api.Group("/permissions")
	pm.Use(middlewares.JWTProtected())
	pm.Get("/", permissions.GetAll)
	pm.Get("/:id", permissions.GetById)
	pm.Post("/", permissions.Create)
	pm.Patch("/:id", permissions.Update)
	pm.Delete("/:id", permissions.Delete)
}
