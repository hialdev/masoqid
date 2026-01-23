package handlers

import (
	"aldev/modules/auth/models"
	cmsModels "aldev/modules/cms/models"
	"aldev/utils"
	"encoding/csv"
	"fmt"
	"io"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type ImportEmployeeRow struct {
	Row         int
	Name        string
	Username    string
	Email       string
	Phone       string
	CountryCode string
	RoleID      string
	Error       string
}

type ImportResult struct {
	Total   int                 `json:"total"`
	Success int                 `json:"success"`
	Failed  int                 `json:"failed"`
	Errors  []ImportEmployeeRow `json:"errors,omitempty"`
}

// ImportEmployees - POST /api/offices/:id/import-employees
func (h *OfficeHandler) ImportEmployees(c *fiber.Ctx) error {
	// Get office ID
	officeIDStr := c.Params("id")
	officeID, err := uuid.Parse(officeIDStr)
	if err != nil {
		return utils.SecureRespApi(c, "bad", "Office ID tidak valid", err.Error(), false)
	}

	// Verify office exists
	var office cmsModels.Office
	if err := h.DB.First(&office, "id = ?", officeID).Error; err != nil {
		return utils.SecureRespApi(c, "empty", "Office tidak ditemukan", nil, false)
	}

	// Get uploaded file
	file, err := c.FormFile("file")
	if err != nil {
		return utils.SecureRespApi(c, "bad", "File tidak ditemukan", err.Error(), false)
	}

	// Validate file size (max 20MB)
	maxSize := int64(20 * 1024 * 1024) // 20MB
	if file.Size > maxSize {
		return utils.SecureRespApi(c, "bad", "Ukuran file melebihi 20MB", nil, false)
	}

	// Validate file extension
	ext := strings.ToLower(file.Filename[strings.LastIndex(file.Filename, ".")+1:])
	if ext != "xlsx" && ext != "xls" && ext != "csv" {
		return utils.SecureRespApi(c, "bad", "Format file harus XLS atau CSV", nil, false)
	}

	// Open file
	fileContent, err := file.Open()
	if err != nil {
		return utils.SecureRespApi(c, "ise", "Gagal membuka file", err.Error(), false)
	}
	defer fileContent.Close()

	var rows []ImportEmployeeRow

	// Parse file based on extension
	if ext == "csv" {
		rows, err = parseCSV(fileContent)
	} else {
		rows, err = parseExcel(fileContent)
	}

	if err != nil {
		return utils.SecureRespApi(c, "bad", "Gagal membaca file", err.Error(), false)
	}

	if len(rows) == 0 {
		return utils.SecureRespApi(c, "bad", "File tidak berisi data", nil, false)
	}

	// Get duplicate strategy
	duplicateStrategy := c.FormValue("duplicate_strategy", "skip") // skip or update

	// Process import
	result := processImport(h.DB, rows, officeID, duplicateStrategy)

	return utils.SecureRespApi(c, "ok", "Import selesai", result, false)
}

func parseCSV(file io.Reader) ([]ImportEmployeeRow, error) {
	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		return nil, err
	}

	if len(records) < 2 {
		return nil, fmt.Errorf("file harus memiliki header dan minimal 1 data")
	}

	// Get header
	header := records[0]
	columnMap := make(map[string]int)
	for i, col := range header {
		columnMap[strings.ToLower(strings.TrimSpace(col))] = i
	}

	// Validate required columns
	requiredCols := []string{"name", "username"}
	for _, col := range requiredCols {
		if _, exists := columnMap[col]; !exists {
			return nil, fmt.Errorf("kolom '%s' wajib ada", col)
		}
	}

	var rows []ImportEmployeeRow
	for i, record := range records[1:] {
		row := ImportEmployeeRow{
			Row:         i + 2, // +2 because header is row 1, data starts at row 2
			Name:        getColumn(record, columnMap, "name"),
			Username:    getColumn(record, columnMap, "username"),
			Email:       getColumn(record, columnMap, "email"),
			Phone:       getColumn(record, columnMap, "phone"),
			CountryCode: getColumn(record, columnMap, "country_code"),
			RoleID:      getColumn(record, columnMap, "role_id"),
		}

		// Set default country code
		if row.CountryCode == "" {
			row.CountryCode = "ID"
		}

		rows = append(rows, row)
	}

	return rows, nil
}

func parseExcel(file io.Reader) ([]ImportEmployeeRow, error) {
	f, err := excelize.OpenReader(file)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	// Get first sheet
	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("file tidak memiliki sheet")
	}

	sheetName := sheets[0]
	records, err := f.GetRows(sheetName)
	if err != nil {
		return nil, err
	}

	if len(records) < 2 {
		return nil, fmt.Errorf("file harus memiliki header dan minimal 1 data")
	}

	// Get header
	header := records[0]
	columnMap := make(map[string]int)
	for i, col := range header {
		columnMap[strings.ToLower(strings.TrimSpace(col))] = i
	}

	// Validate required columns
	requiredCols := []string{"name", "username"}
	for _, col := range requiredCols {
		if _, exists := columnMap[col]; !exists {
			return nil, fmt.Errorf("kolom '%s' wajib ada", col)
		}
	}

	var rows []ImportEmployeeRow
	for i, record := range records[1:] {
		row := ImportEmployeeRow{
			Row:         i + 2,
			Name:        getColumn(record, columnMap, "name"),
			Username:    getColumn(record, columnMap, "username"),
			Email:       getColumn(record, columnMap, "email"),
			Phone:       getColumn(record, columnMap, "phone"),
			CountryCode: getColumn(record, columnMap, "country_code"),
			RoleID:      getColumn(record, columnMap, "role_id"),
		}

		// Set default country code
		if row.CountryCode == "" {
			row.CountryCode = "ID"
		}

		rows = append(rows, row)
	}

	return rows, nil
}

func getColumn(record []string, columnMap map[string]int, colName string) string {
	if idx, exists := columnMap[colName]; exists && idx < len(record) {
		return strings.TrimSpace(record[idx])
	}
	return ""
}

func processImport(db *gorm.DB, rows []ImportEmployeeRow, officeID uuid.UUID, strategy string) ImportResult {
	result := ImportResult{
		Total:   len(rows),
		Success: 0,
		Failed:  0,
		Errors:  []ImportEmployeeRow{},
	}

	for _, row := range rows {
		// Validasi Default Country Code
		if row.CountryCode == "" {
			row.CountryCode = "ID"
		}

		// Validate required fields
		if row.Name == "" {
			row.Error = "Nama wajib diisi"
			result.Errors = append(result.Errors, row)
			result.Failed++
			continue
		}

		if row.Username == "" {
			row.Error = "Username wajib diisi"
			result.Errors = append(result.Errors, row)
			result.Failed++
			continue
		}

		// Validate Email OR Phone requirements
		if row.Email == "" && row.Phone == "" {
			row.Error = "Email atau Nomor Telepon wajib diisi (salah satu)"
			result.Errors = append(result.Errors, row)
			result.Failed++
			continue
		}

		// Parse role ID if provided
		var roleID *uuid.UUID
		if row.RoleID != "" {
			parsedRoleID, err := uuid.Parse(row.RoleID)
			if err != nil {
				row.Error = "Role ID tidak valid"
				result.Errors = append(result.Errors, row)
				result.Failed++
				continue
			}
			roleID = &parsedRoleID
		}

		// Check Duplication (Username, Email, Phone)
		var existingUser models.User
		var isDuplicate bool
		duplicateField := ""

		// Check Username
		if err := db.Where("username = ?", row.Username).First(&existingUser).Error; err == nil {
			isDuplicate = true
			duplicateField = "Username"
		} else if row.Email != "" { // Check Email
			if !strings.Contains(row.Email, "@") {
				row.Error = "Format email tidak valid"
				result.Errors = append(result.Errors, row)
				result.Failed++
				continue
			}
			if err := db.Where("email = ?", row.Email).First(&existingUser).Error; err == nil {
				isDuplicate = true
				duplicateField = "Email"
			}
		} else if row.Phone != "" { // Check Phone
			// Basic phone validation?? Maybe minimal verify?
			if err := db.Where("phone = ?", row.Phone).First(&existingUser).Error; err == nil {
				isDuplicate = true
				duplicateField = "Phone"
			}
		}

		if isDuplicate {
			if strategy == "skip" {
				row.Error = fmt.Sprintf("%s sudah digunakan (%s)", duplicateField, row.Username)
				if duplicateField == "Email" {
					row.Error = fmt.Sprintf("%s sudah digunakan (%s)", duplicateField, row.Email)
				}
				if duplicateField == "Phone" {
					row.Error = fmt.Sprintf("%s sudah digunakan (%s)", duplicateField, row.Phone)
				}

				result.Errors = append(result.Errors, row)
				result.Failed++
				continue
			} else if strategy == "update" {
				// Update existing user
				updates := map[string]interface{}{}
				updates["name"] = row.Name
				updates["country_code"] = row.CountryCode
				if row.Email != "" {
					updates["email"] = row.Email
				}
				if row.Phone != "" {
					updates["phone"] = row.Phone
				}
				if roleID != nil {
					updates["role_id"] = roleID
				}
				updates["office_id"] = officeID

				if err := db.Model(&existingUser).Updates(updates).Error; err != nil {
					row.Error = "Gagal update user: " + err.Error()
					result.Errors = append(result.Errors, row)
					result.Failed++
					continue
				}

				result.Success++
				continue
			}
		}

		// Create user (New)
		user := models.User{
			Name:        &row.Name,
			Username:    &row.Username,
			CountryCode: &row.CountryCode,
			RoleID:      roleID,
			OfficeID:    &officeID,
		}

		if row.Email != "" {
			user.Email = &row.Email
		}

		if row.Phone != "" {
			user.Phone = &row.Phone
		}

		// Save user
		if err := db.Create(&user).Error; err != nil {
			row.Error = "Gagal menyimpan user: " + err.Error()
			result.Errors = append(result.Errors, row)
			result.Failed++
			continue
		}

		result.Success++
	}

	return result
}
