package handlers

import (
	"aldev/modules/global/models"
	"aldev/utils"
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type HandlerGeneric[T any] struct {
	DB *gorm.DB
	Validator *validator.Validate
}

func NewHandlerGeneric[T any](db *gorm.DB) *HandlerGeneric[T] {
	return &HandlerGeneric[T]{DB: db, Validator: validator.New()}
}

func (g *HandlerGeneric[T]) GetAll(c *fiber.Ctx) error {
	preloadStr := c.Query("preload", "")
	preloads := []string{}
	if preloadStr != "" {
		preloads = strings.Split(preloadStr, ",")
	}
	data, err := models.All[T](g.DB, preloads...)
	if err != nil {
		return utils.RespApi(c, "ise", "Gagal Query All", err.Error())
	}
	return utils.RespApi(c, "ok", "Mendapatkan Semua Data", data)
}

func (g *HandlerGeneric[T]) GetById(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "UUID Tidak Valid", id)
	}

	preloadStr := c.Query("preload", "")
	preloads := []string{}
	if preloadStr != "" {
		preloads = strings.Split(preloadStr, ",")
	}

	data, err := models.Find[T](g.DB, id, preloads...)
	if err != nil {
		return utils.RespApi(c, "empty", "Tidak menemukan data id "+idStr, id)
	}

	return utils.RespApi(c, "ok", "Mendapatkan Data", data)
}

func (g *HandlerGeneric[T]) Create(c *fiber.Ctx) error {
	var input T
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak sesuai", input)
	}

	if err := utils.Validate.Struct(input); err != nil {
        if verrs, ok := err.(validator.ValidationErrors); ok {
            translated := verrs.Translate(utils.Translator)
            return utils.RespApi(c, "bad", "Validasi gagal", translated)
        }
        return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
    }

	if err := g.DB.Create(&input).Error; err != nil {
		return utils.RespApi(c, "ise", "Terdapat kesalahan saat membuat data", err.Error())
	}

	return utils.RespApi(c, "add", "Membuat Data", input)
}

func (g *HandlerGeneric[T]) Update(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "UUID Tidak Valid", id)
	}

	var input T
	
	if err := c.BodyParser(&input); err != nil {
		return utils.RespApi(c, "bad", "Request Body tidak valid", input)
	}

	if err := utils.Validate.Struct(input); err != nil {
        if verrs, ok := err.(validator.ValidationErrors); ok {
            translated := verrs.Translate(utils.Translator)
            return utils.RespApi(c, "bad", "Validasi gagal", translated)
        }
        return utils.RespApi(c, "bad", "Validasi gagal", err.Error())
    }
	
	var existing T
	if err := g.DB.First(&existing, "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "empty", "Data dengan id tersebut tidak ditemukan", id)
	}

	v := reflect.ValueOf(&input).Elem()
	idField := v.FieldByName("ID")
	if idField.IsValid() && idField.CanSet() && idField.Kind() == reflect.Struct {
		idField.Set(reflect.ValueOf(id))
	}

	if err := g.DB.Model(&existing).Updates(input).Error; err != nil {
		return utils.RespApi(c, "ise", "Terjadi masalah saat mengupdate data", input)
	}

	return utils.RespApi(c, "ok", "Memperbarui Data", existing)
}

func (g *HandlerGeneric[T]) Delete(c *fiber.Ctx) error{
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return utils.RespApi(c, "bad", "UUID Tidak Valid", id)
	}

	if err:= g.DB.Delete(new(T), "id = ?", id).Error; err != nil {
		return utils.RespApi(c, "ise", "Terjadi masalah saat menghapus data", id)
	}

	return utils.RespApi(c, "ok", "Menghapus Data", id)
}
