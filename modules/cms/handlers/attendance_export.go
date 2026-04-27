package handlers

import (
	"aldev/modules/auth/models"
	cmsModels "aldev/modules/cms/models"
	"aldev/utils"
	"encoding/csv"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
)

// ExportAttendance - GET /api/attendance/export
func (h *AttendanceHandler) ExportAttendance(c *fiber.Ctx) error {
	// Get query parameters
	format := c.Query("format", "xlsx") // xlsx or csv
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	officeIDStr := c.Query("office_id")
	userIDStr := c.Query("user_id")

	// Validate format
	if format != "xlsx" && format != "csv" {
		return utils.SecureRespApi(c, "bad", "Format harus 'xlsx' atau 'csv'", nil, false)
	}

	// Validate date range
	if startDate == "" || endDate == "" {
		return utils.SecureRespApi(c, "bad", "start_date dan end_date wajib diisi", nil, false)
	}

	// Build query
	query := h.DB.Model(&cmsModels.Attendance{}).
		Select("attendances.*, users.name as user_name").
		Joins("LEFT JOIN users ON attendances.user_id = users.id")
 
	// --- Multi-tenancy: Filter by current user's company
	userIDStrFromCtx, ok := c.Locals("user_id").(string)
	if ok && userIDStrFromCtx != "" {
		var currentUser models.User
		if err := h.DB.Preload("Role").First(&currentUser, "id = ?", userIDStrFromCtx).Error; err == nil {
			isManager := currentUser.Role.Name == "Company Owner" || currentUser.Role.Name == "Office Manager"
			if currentUser.RoleID != nil && isManager && currentUser.CompanyID != nil {
				query = query.Where("users.company_id = ?", currentUser.CompanyID)
			}
		}
	}

	// Apply filters
	if startDate != "" {
		query = query.Where("DATE(attendance_time) >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("DATE(attendance_time) <= ?", endDate)
	}
	if officeIDStr != "" {
		officeID, err := uuid.Parse(officeIDStr)
		if err == nil {
			// Filter based on User's Office ID (to cover historical data)
			query = query.Where("users.office_id = ?", officeID)
		}
	}
	if userIDStr != "" {
		userID, err := uuid.Parse(userIDStr)
		if err == nil {
			query = query.Where("attendances.user_id = ?", userID)
		}
	}

	// Limit to prevent huge exports
	query = query.Limit(10000)

	// Fetch data
	var attendances []cmsModels.Attendance
	if err := query.Order("attendance_time DESC").Find(&attendances).Error; err != nil {
		return utils.SecureRespApi(c, "ise", "Gagal mengambil data attendance", err.Error(), false)
	}

	if len(attendances) == 0 {
		return utils.SecureRespApi(c, "empty", "Tidak ada data untuk di-export", nil, false)
	}

	// Generate file
	var fileData []byte
	var err error
	var contentType string
	var filename string

	if format == "xlsx" {
		fileData, err = generateExcelAttendance(attendances)
		contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		filename = fmt.Sprintf("attendance-export-%s.xlsx", time.Now().Format("2006-01-02"))
	} else {
		fileData, err = generateCSVAttendance(attendances)
		contentType = "text/csv"
		filename = fmt.Sprintf("attendance-export-%s.csv", time.Now().Format("2006-01-02"))
	}

	if err != nil {
		return utils.SecureRespApi(c, "ise", "Gagal generate file export", err.Error(), false)
	}

	// Set headers for download
	c.Set("Content-Type", contentType)
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Set("Content-Length", strconv.Itoa(len(fileData)))

	return c.Send(fileData)
}

func generateExcelAttendance(attendances []cmsModels.Attendance) ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Attendance"
	index, err := f.NewSheet(sheetName)
	if err != nil {
		return nil, err
	}

	// Set headers
	headers := []string{
		"Date", "Time", "Type", "User ID", "Name",
		"Latitude", "Longitude", "Location Accuracy",
		"Status", "Photo URL",
	}

	for i, header := range headers {
		cell := fmt.Sprintf("%s1", string(rune('A'+i)))
		f.SetCellValue(sheetName, cell, header)
	}

	// Style header
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#0069cb"}, Pattern: 1},
		Font: &excelize.Font{Bold: true, Color: "#FFFFFF"},
	})
	f.SetCellStyle(sheetName, "A1", fmt.Sprintf("%s1", string(rune('A'+len(headers)-1))), headerStyle)

	// Get Base URL
	baseURL := fmt.Sprintf("http://%s:%s/", os.Getenv("APP_HOST"), os.Getenv("APP_PORT"))
	// handle if APP_URL is set in prod
	if os.Getenv("APP_ENV") == "production" {
		baseURL = os.Getenv("APP_URL") + "/"
	}

	// Fill data
	for i, att := range attendances {
		row := i + 2

		// Date
		date := att.AttendanceTime.Format("2006-01-02")
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), date)

		// Time
		timeStr := att.AttendanceTime.Format("15:04:05")
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), timeStr)

		// Type
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), att.AttendanceType)

		// User ID
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), att.UserID.String())

		// Name
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), att.UserName)

		// Latitude
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), att.Latitude)

		// Longitude
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), att.Longitude)

		// Location Accuracy
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), att.LocationAccuracy)

		// Status
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), att.Status)

		// Photo URL
		photoURL := att.PhotoURL
		if photoURL != "" && !strings.HasPrefix(photoURL, "http") {
			photoURL = baseURL + photoURL
		}
		f.SetCellValue(sheetName, fmt.Sprintf("J%d", row), photoURL)
	}

	// Auto-fit columns
	for i := 0; i < len(headers); i++ {
		col := string(rune('A' + i))
		f.SetColWidth(sheetName, col, col, 20)
	}

	f.SetActiveSheet(index)
	f.DeleteSheet("Sheet1")

	// Save to buffer
	buffer, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}

	return buffer.Bytes(), nil
}

func generateCSVAttendance(attendances []cmsModels.Attendance) ([]byte, error) {
	var buffer []byte
	writer := csv.NewWriter(&bufferWriter{buffer: &buffer})

	// Write headers
	headers := []string{
		"Date", "Time", "Type", "User ID", "Name",
		"Latitude", "Longitude", "Location Accuracy",
		"Status", "Photo URL",
	}
	writer.Write(headers)

	// Get Base URL
	baseURL := fmt.Sprintf("http://%s:%s/", os.Getenv("APP_HOST"), os.Getenv("APP_PORT"))
	if os.Getenv("APP_ENV") == "production" {
		baseURL = os.Getenv("APP_URL") + "/"
	}

	// Write data
	for _, att := range attendances {
		// Photo URL
		photoURL := att.PhotoURL
		if photoURL != "" && !strings.HasPrefix(photoURL, "http") {
			photoURL = baseURL + photoURL
		}

		row := []string{
			att.AttendanceTime.Format("2006-01-02"),
			att.AttendanceTime.Format("15:04:05"),
			att.AttendanceType,
			att.UserID.String(),
			att.UserName,
			fmt.Sprintf("%.6f", att.Latitude),
			fmt.Sprintf("%.6f", att.Longitude),
			fmt.Sprintf("%.2f", att.LocationAccuracy),
			att.Status,
			photoURL,
		}
		writer.Write(row)
	}

	writer.Flush()
	return buffer, writer.Error()
}

// Helper type for CSV writing
type bufferWriter struct {
	buffer *[]byte
}

func (bw *bufferWriter) Write(p []byte) (n int, err error) {
	*bw.buffer = append(*bw.buffer, p...)
	return len(p), nil
}
