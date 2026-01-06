package handlers

import (
	"aldev/modules/cms/models"
	"aldev/utils"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ExampleRichHandlerInitialInput struct {
	Title       *string  `json:"title" validate:"omitempty,max=300"`
	Slug        *string  `json:"slug" validate:"omitempty,max=300"`
	Description *string  `json:"description,omitempty" validate:"omitempty"`
	Image       *string  `json:"image,omitempty" validate:"omitempty"`
	Content     *string  `json:"content,omitempty" validate:"omitempty"`
	Galleries   []string `json:"galleries,omitempty" validate:"omitempty,max=5"`
}

type ExampleRichHandler struct {
	DB *gorm.DB
}

func NewExampleRichHandler(db *gorm.DB) *ExampleRichHandler {
	return &ExampleRichHandler{DB: db}
}

func (h *ExampleRichHandler) GetExampleRichHandler(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "Id yang diberikan tidak valid", nil)
	}

	var exampleRich models.ExampleRich
	if err := h.DB.First(&exampleRich, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data Example Rich", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data Example Rich", exampleRich)
}

func (h *ExampleRichHandler) GetAllExampleRichHandlers(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	search := strings.ToLower(c.Query("search", ""))
	sort := c.Query("sort", "id")
	order := c.Query("order", "asc")

	offset := (page - 1) * limit

	db := h.DB.Model(&models.ExampleRich{})

	// --- Filter search
	if search != "" {
		db = db.Where(`
			LOWER(title) LIKE ? OR 
			LOWER(description) LIKE ?`,
			"%"+search+"%", "%"+search+"%",
		)
	}

	// --- Hitung total
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal hitung total", err.Error())
	}

	// --- Sorting (whitelisted)
	validSortFields := map[string]string{
		"id":          "id",
		"title":       "title",
		"description": "description",
		"created_at":  "created_at",
	}
	sortBy, ok := validSortFields[sort]
	if !ok {
		sortBy = "id"
	}
	db = db.Order(fmt.Sprintf("%s %s", sortBy, order))

	// --- Ambil data
	var exampleRichs []models.ExampleRich
	if err := db.Offset(offset).Limit(limit).Find(&exampleRichs).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal ambil data", err.Error())
	}

	totalPages := (total + int64(limit) - 1) / int64(limit)

	// Konversi exampleRichs ke format yang bisa di-serialize dengan benar
	var responseExampleRichHandler []map[string]interface{}
	for _, exampleRich := range exampleRichs {
		// Buat response object dengan format JSON yang benar
		responseExampleRich := map[string]interface{}{
			"id":          exampleRich.ID,
			"created_at":  exampleRich.CreatedAt,
			"updated_at":  exampleRich.UpdatedAt,
			"title":       exampleRich.Title,
			"slug":        exampleRich.Slug,
			"description": exampleRich.Description,
			"image":       exampleRich.Image,
			"content":     exampleRich.Content,
			"galleries":   exampleRich.Galleries,
		}
		responseExampleRichHandler = append(responseExampleRichHandler, responseExampleRich)
	}

	result := fiber.Map{
		"example_rich_handler": responseExampleRichHandler,
		"pagination": fiber.Map{
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": totalPages,
		},
	}

	return utils.RespApi(c, "ok", "Berhasil mendapatkan data exampleRichs", result)
}

func (h *ExampleRichHandler) AddExampleRichHandler(c *fiber.Ctx) error {
	var input ExampleRichHandlerInitialInput

	contentType := c.Get("Content-Type")
	if strings.Contains(contentType, "multipart/form-data") {
		// Handle multipart form data for file uploads
		title := c.FormValue("title")
		slug := c.FormValue("slug")
		description := c.FormValue("description")
		content := c.FormValue("content")

		input = ExampleRichHandlerInitialInput{
			Title:       &title,
			Slug:        &slug,
			Description: &description,
			Content:     &content,
		}

		// Handle file upload
		if file, err := c.FormFile("image"); err == nil && file != nil {
			filePath, err := utils.UploadFile(c, "image", "event_types")
			if err != nil {
				return utils.RespApi(c, "bad", "Gagal upload image Example Rich", err.Error())
			}
			input.Image = &filePath
		}

		// Handle galleries upload - process galleries first
		galleries := []string{}
		// Check if there are multiple files in the galleries field
		form, err := c.MultipartForm()
		if err == nil {
			galleryFiles := form.File["galleries"]
			if len(galleryFiles) > 0 {
				// Use UploadFileFlex to handle multiple files properly
				if filePaths, err := utils.UploadFileFlex(c, "galleries", "event_types"); err == nil && len(filePaths) > 0 {
					galleries = filePaths
				}
			}
		} else {
			// Fallback to single file processing if multipart form parsing fails
			galleryFiles, _ := c.FormFile("galleries")
			if galleryFiles != nil {
				// Handle single file
				if filePath, err := utils.UploadFile(c, "galleries", "event_types"); err == nil {
					galleries = append(galleries, filePath)
				}
			} else {
				// Handle multiple files using UploadFileFlex
				if filePaths, err := utils.UploadFileFlex(c, "galleries", "event_types"); err == nil && len(filePaths) > 0 {
					galleries = filePaths
				}
			}
		}

		if len(galleries) > 0 {
			input.Galleries = galleries
		}
	} else {
		// Handle JSON data
		if err := c.BodyParser(&input); err != nil {
			return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
		}
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	// Convert galleries slice to JSON string for storage
	var galleriesJSON *string
	if len(input.Galleries) > 0 {
		galleriesBytes, err := json.Marshal(input.Galleries)
		if err != nil {
			return utils.RespApi(c, "ise", "Gagal mengkonversi galleries ke JSON", err.Error())
		}
		galleriesStr := string(galleriesBytes)
		galleriesJSON = &galleriesStr
	}

	exampleRich := models.ExampleRich{
		Title:       input.Title,
		Slug:        input.Slug,
		Description: input.Description,
		Image:       input.Image,
		Content:     input.Content,
		Galleries:   galleriesJSON,
	}

	if err := h.DB.Create(&exampleRich).Error; err != nil {
		return utils.RespApi(c, "ise", "Tidak dapat membuat Example Rich", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil membuat data Example Rich", exampleRich)
}

func (h *ExampleRichHandler) UpdateExampleRichHandler(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	var exampleRich models.ExampleRich
	if err := h.DB.First(&exampleRich, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal Mendapatkan Example Rich", err.Error())
	}

	var input ExampleRichHandlerInitialInput

	contentType := c.Get("Content-Type")
	if strings.Contains(contentType, "multipart/form-data") {
		// Handle multipart form data for file uploads
		title := c.FormValue("title")
		slug := c.FormValue("slug")
		description := c.FormValue("description")
		content := c.FormValue("content")

		input = ExampleRichHandlerInitialInput{
			Title:       &title,
			Slug:        &slug,
			Description: &description,
			Content:     &content,
		}

		// Handle file upload
		if file, err := c.FormFile("image"); err == nil && file != nil {
			oldImagePath := ""
			if exampleRich.Image != nil {
				oldImagePath = *exampleRich.Image
			}

			filePath, err := utils.UpdateFile(c, oldImagePath, "image", "event_types")
			if err != nil {
				return utils.RespApi(c, "bad", "Gagal memperbarui image Example Rich", err.Error())
			}
			input.Image = &filePath
		} else {
			// Jika tidak ada file image yang diupload, gunakan image yang lama
			input.Image = exampleRich.Image
		}

		// Handle galleries upload
		var galleries []string
		// Parse existing galleries from JSON string if they exist
		if exampleRich.Galleries != nil {
			if err := json.Unmarshal([]byte(*exampleRich.Galleries), &galleries); err != nil {
				galleries = []string{} // Initialize as empty if parsing fails
			}
		}

		// Check if new gallery files are being uploaded
		galleryFiles, _ := c.MultipartForm()
		if galleryFiles != nil {
			galleryFileList := galleryFiles.File["galleries"]
			if len(galleryFileList) > 0 {
				// Upload new gallery files
				if filePaths, err := utils.UploadFileFlex(c, "galleries", "event_types"); err == nil && len(filePaths) > 0 {
					// Append new galleries to existing galleries
					galleries = append(galleries, filePaths...)
				}
			}
		}
		input.Galleries = galleries
	} else {
		// Handle JSON data
		if err := c.BodyParser(&input); err != nil {
			return utils.RespApi(c, "bad", "Request Body tidak valid", err.Error())
		}
	}

	if err := utils.Validate.Struct(input); err != nil {
		if verrs, ok := err.(validator.ValidationErrors); ok {
			return utils.RespApi(c, "bad", "Validasi gagal", verrs.Translate(utils.Translator))
		}
		return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
	}

	// Convert galleries slice to JSON string for storage
	var galleriesJSON *string
	if len(input.Galleries) > 0 {
		galleriesBytes, err := json.Marshal(input.Galleries)
		if err != nil {
			return utils.RespApi(c, "ise", "Gagal mengkonversi galleries ke JSON", err.Error())
		}
		galleriesStr := string(galleriesBytes)
		galleriesJSON = &galleriesStr
	}

	updates := map[string]interface{}{
		"title":       input.Title,
		"slug":        input.Slug,
		"description": input.Description,
		"image":       input.Image,
		"content":     input.Content,
		"galleries":   galleriesJSON,
	}

	if err := h.DB.Model(&exampleRich).Updates(updates).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal memperbarui data Example Rich", err.Error())
	}

	// Ambil data terbaru
	if err := h.DB.First(&exampleRich, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal mendapatkan data terbaru", err.Error())
	}

	// Buat response object dengan format JSON yang benar
	responseExampleRich := map[string]interface{}{
		"id":          exampleRich.ID,
		"created_at":  exampleRich.CreatedAt,
		"updated_at":  exampleRich.UpdatedAt,
		"title":       exampleRich.Title,
		"slug":        exampleRich.Slug,
		"description": exampleRich.Description,
		"image":       exampleRich.Image,
		"content":     exampleRich.Content,
		"galleries":   exampleRich.Galleries,
	}

	return utils.RespApi(c, "ok", "Berhasil memperbarui data Example Rich", responseExampleRich)
}

func (h *ExampleRichHandler) DeleteExampleRichHandler(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return utils.RespApi(c, "bad", "ID yang diberikan tidak valid", nil)
	}

	var exampleRich models.ExampleRich
	if err := h.DB.First(&exampleRich, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal Mendapatkan Example Rich", err.Error())
	}

	// Hapus file terkait jika ada
	if exampleRich.Image != nil && *exampleRich.Image != "" {
		utils.DeleteFile(*exampleRich.Image)
	}
	// Hapus gallery files
	if exampleRich.Galleries != nil {
		var galleries []string
		if err := json.Unmarshal([]byte(*exampleRich.Galleries), &galleries); err == nil {
			for _, galleryPath := range galleries {
				if galleryPath != "" {
					utils.DeleteFile(galleryPath)
				}
			}
		}
	}

	if err := h.DB.Delete(&exampleRich).Error; err != nil {
		return utils.RespApi(c, "ise", "Gagal Menghapus Example Rich", err.Error())
	}

	return utils.RespApi(c, "ok", "Berhasil Menghapus Example Rich", nil)
}
