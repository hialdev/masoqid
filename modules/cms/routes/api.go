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
	attendanceGroup.Get("/", middlewares.DoACL("Read Attendance"), attHandler.GetAllAttendance)       // GET /attendance
	attendanceGroup.Get("/export", middlewares.DoACL("Read Attendance"), attHandler.ExportAttendance) // GET /attendance/export

	// My Attendance
	api.Get("/my-attendance", middlewares.JWTProtected(), attHandler.GetMyAttendance)

	// ✅ Office Routes
	officeHandler := handlers.NewOfficeHandler(db)
	office := api.Group("/offices")
	office.Use(middlewares.JWTProtected())
	office.Get("/", middlewares.DoACL("Read Office"), officeHandler.GetAllOffices)
	office.Post("/", middlewares.DoACL("Add Office"), officeHandler.CreateOffice)
	office.Get("/:id", middlewares.DoACL("Read Office"), officeHandler.GetOffice)
	office.Get("/:id/users", middlewares.DoACL("Read Office"), officeHandler.GetOfficeUsers)
	office.Patch("/:id", middlewares.DoACL("Update Office"), officeHandler.UpdateOffice)
	office.Delete("/:id", middlewares.DoACL("Delete Office"), officeHandler.DeleteOffice)
	office.Post("/:id/assign-users", middlewares.DoACL("Assign Office"), officeHandler.AssignUsers)
	office.Post("/:id/import-employees", middlewares.DoACL("Import Office"), officeHandler.ImportEmployees) // NEW

	// ✅ Shift Management Routes
	shiftHandler := handlers.NewShiftHandler(db)
	shiftGroup := api.Group("/shifts")
	shiftGroup.Use(middlewares.JWTProtected())
	shiftGroup.Get("/", middlewares.DoACL("Read Shift"), shiftHandler.GetMonthlySchedule)
	shiftGroup.Get("/all", middlewares.DoACL("Read Shift"), shiftHandler.GetAllShifts)
	shiftGroup.Post("/", middlewares.DoACL("Add Shift"), shiftHandler.CreateShift)
	shiftGroup.Post("/bulk", middlewares.DoACL("Add Shift"), shiftHandler.BulkCreateShifts)
	// switch harus sebelum /:id agar tidak konflik
	shiftGroup.Post("/switch", middlewares.DoACL("Update Shift"), shiftHandler.SwitchShifts)
	shiftGroup.Get("/:id", middlewares.DoACL("Read Shift"), shiftHandler.GetShiftByID)
	shiftGroup.Patch("/:id", middlewares.DoACL("Update Shift"), shiftHandler.UpdateShift)
	shiftGroup.Delete("/:id", middlewares.DoACL("Delete Shift"), shiftHandler.DeleteShift)

	// My Shifts (karyawan lihat shift sendiri — hanya JWT, tanpa ACL)
	api.Get("/my-shifts", middlewares.JWTProtected(), shiftHandler.GetMyShifts)

	// ✅ Salary Routes
	salaryHandler := handlers.NewSalaryHandler(db)
	api.Post("/users/:id/salary",
		middlewares.JWTProtected(),
		middlewares.DoACL("Update User Salary"),
		salaryHandler.UpdateUserSalary,
	)
	salaryGroup := api.Group("/salary")
	salaryGroup.Use(middlewares.JWTProtected())
	salaryGroup.Use(middlewares.DoACL("Read Salary")).Get("/report", salaryHandler.GetSalaryReport)
	salaryGroup.Use(middlewares.DoACL("Read Salary")).Get("/report/export", salaryHandler.ExportSalaryReport)

	// ✅ Company Routes (Super Admin Only)
	companyHandler := handlers.NewCompanyHandler(db)
	company := api.Group("/companies")
	company.Use(middlewares.JWTProtected())
	company.Get("/", middlewares.DoACL("Read Company"), companyHandler.GetAllCompanies)
	company.Get("/:id", middlewares.DoACL("Read Company"), companyHandler.GetCompany)
	company.Post("/", middlewares.DoACL("Add Company"), companyHandler.CreateCompany)
	company.Patch("/:id", middlewares.DoACL("Update Company"), companyHandler.UpdateCompany)
	company.Delete("/:id", middlewares.DoACL("Delete Company"), companyHandler.DeleteCompany)

	// ✅ Profile / Employee Routes
	profileHandler := handlers.NewProfileHandler(db)
	profileGroup := api.Group("/profiles")
	profileGroup.Use(middlewares.JWTProtected())
	profileGroup.Get("/", middlewares.DoACL("Read Employee"), profileHandler.GetAllProfiles)
	profileGroup.Get("/:id", middlewares.DoACL("Read Employee"), profileHandler.GetProfile)
	profileGroup.Post("/", middlewares.DoACL("Add Employee"), profileHandler.CreateProfile)
	profileGroup.Patch("/:id", middlewares.DoACL("Update Employee"), profileHandler.UpdateProfile)
	profileGroup.Delete("/:id", middlewares.DoACL("Delete Employee"), profileHandler.DeleteProfile)
	// JWT only — karyawan lihat/update profile sendiri
	api.Get("/my-profile", middlewares.JWTProtected(), profileHandler.GetMyProfile)

	// ✅ Shift Switch Requests
	switchHandler := handlers.NewShiftSwitchHandler(db)
	switchGroup := api.Group("/shift-switch-requests")
	switchGroup.Use(middlewares.JWTProtected())
	switchGroup.Get("/", middlewares.DoACL("Read Shift Switch"), switchHandler.GetAllRequests)
	switchGroup.Patch("/:id/approve", middlewares.DoACL("Approve Shift Switch"), switchHandler.ApproveRequest)
	switchGroup.Patch("/:id/reject", middlewares.DoACL("Reject Shift Switch"), switchHandler.RejectRequest)
	// JWT only — karyawan buat & lihat request sendiri
	api.Post("/shift-switch-requests", middlewares.JWTProtected(), switchHandler.CreateRequest)
	api.Get("/my-shift-switch-requests", middlewares.JWTProtected(), switchHandler.GetMyRequests)

	// ✅ Bulk Shift Endpoints (sebelum /:id agar tidak konflik)
	shiftGroup.Delete("/bulk", middlewares.DoACL("Delete Shift"), shiftHandler.BulkDeleteShifts)

	// ✅ Shift Logs / History
	logHandler := handlers.NewShiftLogHandler(db)
	api.Get("/shift-logs", middlewares.JWTProtected(), logHandler.GetAllLogs)
}

