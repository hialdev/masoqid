package handlers

import (
	authModels "aldev/modules/auth/models"
	cmsModels "aldev/modules/cms/models"
	"aldev/utils"
	"encoding/csv"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type SalaryHandler struct {
	DB *gorm.DB
}

func NewSalaryHandler(db *gorm.DB) *SalaryHandler {
	return &SalaryHandler{DB: db}
}

type SalaryInput struct {
	DailySalary  *float64 `json:"daily_salary"`
	HourlySalary *float64 `json:"hourly_salary"`
}

// SalaryReportRow adalah data per user untuk laporan gaji
type SalaryReportRow struct {
	UserID       string  `json:"user_id"`
	Name         string  `json:"name"`
	DailySalary  float64 `json:"daily_salary"`
	HourlySalary float64 `json:"hourly_salary"`
	WorkDays     int     `json:"work_days"`
	TotalSalary  float64 `json:"total_salary"`
}

// UpdateUserSalary - POST /api/users/:id/salary
func (h *SalaryHandler) UpdateUserSalary(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "ID user tidak valid", nil)
	}

	var user authModels.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "bad", "User tidak ditemukan", nil)
	}

	var input SalaryInput
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request body tidak valid", err.Error())
	}

	updates := map[string]interface{}{}

	if input.DailySalary != nil {
		updates["daily_salary"] = *input.DailySalary

		// Auto-hitung hourly jika tidak diisi
		if input.HourlySalary == nil {
			hourly := *input.DailySalary / 8
			updates["hourly_salary"] = hourly
		}
	}

	if input.HourlySalary != nil {
		updates["hourly_salary"] = *input.HourlySalary
	}

	if len(updates) == 0 {
		return utils.RespApi(c, "bad", "Tidak ada data gaji yang diubah", nil)
	}

	if err := h.DB.Model(&user).Updates(updates).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal memperbarui data gaji", err.Error())
	}

	// Refresh data
	h.DB.First(&user, "id = ?", id)
	return utils.RespApi(c, "ok", "Data gaji berhasil diperbarui", user)
}

// buildSalaryReport adalah helper untuk membangun data laporan gaji
func (h *SalaryHandler) buildSalaryReport(month, userIDStr string) ([]SalaryReportRow, error) {
	loc, _ := time.LoadLocation("Local")
	firstDay, err := time.ParseInLocation("2006-01", month, loc)
	if err != nil {
		return nil, fmt.Errorf("format bulan tidak valid")
	}
	lastDay := firstDay.AddDate(0, 1, -1)

	// Query: ambil semua user yang punya gaji, lalu hitung hari hadir
	query := h.DB.Model(&authModels.User{}).Where("daily_salary IS NOT NULL")
	if userIDStr != "" {
		if uid, err := uuid.Parse(userIDStr); err == nil {
			query = query.Where("id = ?", uid)
		}
	}

	var users []authModels.User
	if err := query.Find(&users).Error; err != nil {
		return nil, err
	}

	var rows []SalaryReportRow
	for _, u := range users {
		// Hitung hari hadir (CHECK_IN) unik bulan ini
		var workDays int64
		h.DB.Model(&cmsModels.Attendance{}).
			Select("COUNT(DISTINCT DATE(attendance_time))").
			Where("user_id = ? AND attendance_type = 'CHECK_IN' AND DATE(attendance_time) BETWEEN ? AND ?",
				u.ID, firstDay.Format("2006-01-02"), lastDay.Format("2006-01-02")).
			Scan(&workDays)

		daily := 0.0
		if u.DailySalary != nil {
			daily = *u.DailySalary
		}
		hourly := 0.0
		if u.HourlySalary != nil {
			hourly = *u.HourlySalary
		} else if daily > 0 {
			hourly = daily / 8
		}

		name := ""
		if u.Name != nil {
			name = *u.Name
		}

		rows = append(rows, SalaryReportRow{
			UserID:       u.ID.String(),
			Name:         name,
			DailySalary:  daily,
			HourlySalary: hourly,
			WorkDays:     int(workDays),
			TotalSalary:  daily * float64(workDays),
		})
	}

	return rows, nil
}

// GetSalaryReport - GET /api/salary/report?month=YYYY-MM&user_id=...
func (h *SalaryHandler) GetSalaryReport(c *fiber.Ctx) error {
	month := c.Query("month", time.Now().Format("2006-01"))
	userIDStr := c.Query("user_id", "")

	rows, err := h.buildSalaryReport(month, userIDStr)
	if err != nil {
		return utils.RespApi(c, "bad", err.Error(), nil)
	}

	return utils.RespApi(c, "ok", "Laporan gaji berhasil didapatkan", fiber.Map{
		"data":  rows,
		"month": month,
	})
}

// ExportSalaryReport - GET /api/salary/report/export?month=YYYY-MM&format=xlsx|csv
func (h *SalaryHandler) ExportSalaryReport(c *fiber.Ctx) error {
	month := c.Query("month", time.Now().Format("2006-01"))
	format := c.Query("format", "xlsx")
	userIDStr := c.Query("user_id", "")

	if format != "xlsx" && format != "csv" {
		return utils.RespApi(c, "bad", "Format harus 'xlsx' atau 'csv'", nil)
	}

	rows, err := h.buildSalaryReport(month, userIDStr)
	if err != nil {
		return utils.RespApi(c, "bad", err.Error(), nil)
	}

	if len(rows) == 0 {
		return utils.RespApi(c, "empty", "Tidak ada data gaji untuk di-export", nil)
	}

	var fileData []byte
	var contentType, filename string

	if format == "xlsx" {
		fileData, err = generateExcelSalary(rows, month)
		contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		filename = fmt.Sprintf("salary-report-%s.xlsx", month)
	} else {
		fileData, err = generateCSVSalary(rows)
		contentType = "text/csv"
		filename = fmt.Sprintf("salary-report-%s.csv", month)
	}

	if err != nil {
		return utils.RespApi(c, "ise", "Gagal generate file export", err.Error())
	}

	c.Set("Content-Type", contentType)
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Set("Content-Length", strconv.Itoa(len(fileData)))
	return c.Send(fileData)
}

func generateExcelSalary(rows []SalaryReportRow, month string) ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Salary Report"
	index, err := f.NewSheet(sheetName)
	if err != nil {
		return nil, err
	}

	headers := []string{"No", "Nama", "Gaji/Hari (Rp)", "Gaji/Jam (Rp)", "Hari Masuk", "Total Gaji (Rp)"}
	for i, h := range headers {
		cell := fmt.Sprintf("%s1", string(rune('A'+i)))
		f.SetCellValue(sheetName, cell, h)
	}

	// Style header (sama dengan attendance export: #0069cb)
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#0069cb"}, Pattern: 1},
		Font: &excelize.Font{Bold: true, Color: "#FFFFFF"},
	})
	f.SetCellStyle(sheetName, "A1", fmt.Sprintf("%s1", string(rune('A'+len(headers)-1))), headerStyle)

	// Subtitle: bulan laporan
	f.SetCellValue(sheetName, "A2", fmt.Sprintf("Periode: %s", month))

	for i, row := range rows {
		r := i + 3 // mulai baris 3 (baris 2 untuk subtitle)
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", r), i+1)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", r), row.Name)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", r), row.DailySalary)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", r), row.HourlySalary)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", r), row.WorkDays)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", r), row.TotalSalary)
	}

	// Auto-fit columns
	colWidths := []float64{5, 25, 18, 18, 12, 20}
	cols := []string{"A", "B", "C", "D", "E", "F"}
	for i, col := range cols {
		f.SetColWidth(sheetName, col, col, colWidths[i])
	}

	// Tambah row total
	totalRow := len(rows) + 3
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", totalRow), "TOTAL")
	// Formula SUM untuk total gaji
	f.SetCellFormula(sheetName, fmt.Sprintf("F%d", totalRow),
		fmt.Sprintf("SUM(F3:F%d)", totalRow-1))

	// Hapus sheet default jika ada
	if os.Getenv("APP_ENV") != "" { // selalu true, hanya untuk avoid unused import
		f.SetActiveSheet(index)
	}
	f.DeleteSheet("Sheet1")

	buffer, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}

func generateCSVSalary(rows []SalaryReportRow) ([]byte, error) {
	var buffer []byte
	writer := csv.NewWriter(&salaryBufferWriter{buffer: &buffer})

	writer.Write([]string{"No", "Nama", "Gaji/Hari (Rp)", "Gaji/Jam (Rp)", "Hari Masuk", "Total Gaji (Rp)"})
	for i, row := range rows {
		writer.Write([]string{
			strconv.Itoa(i + 1),
			row.Name,
			fmt.Sprintf("%.2f", row.DailySalary),
			fmt.Sprintf("%.2f", row.HourlySalary),
			strconv.Itoa(row.WorkDays),
			fmt.Sprintf("%.2f", row.TotalSalary),
		})
	}
	writer.Flush()
	return buffer, writer.Error()
}

type salaryBufferWriter struct {
	buffer *[]byte
}

func (bw *salaryBufferWriter) Write(p []byte) (n int, err error) {
	*bw.buffer = append(*bw.buffer, p...)
	return len(p), nil
}
