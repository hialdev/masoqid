package utils

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type SavedFile struct {
	Path string
	Mime string
	Size int64
}

var (
	sizeLimit int = 10; // MB
	uploadFolder string ="uploads"
	allowed = map[string]bool{
		".webp": true, ".png": true, ".jpg": true, ".jpeg": true,
		".tiff": true, ".svg": true, ".pdf": true,
		".docx": true, ".ppt": true, ".pptx": true,
		".doc": true, ".xlsx": true, ".csv": true,
		".xls": true, ".txt": true, ".avif": true,
	}
)

func UploadFile(c *fiber.Ctx, fieldName string, folder string) (string, error) {
	fileHeader, err := c.FormFile(fieldName)
	if err != nil{
		return "", err
	}

	if !checkExtAllowed(filepath.Ext(fileHeader.Filename)) {
		return "", fmt.Errorf("%s","Jenis file tidak didukung")
	}

	if int(fileHeader.Size) > sizeLimit*1024*1024 {
		return "", fmt.Errorf("ukuran File melebihi dari %dMB", sizeLimit)
	}

	filename := newFileName(fileHeader.Filename)
	relativePath := filepath.Join(uploadFolder, folder, filename)
	filePath := filepath.Join(".",relativePath)

	src, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	if err := storeFile(src, filePath); err != nil {
		return "", err
	}

	return relativePath, nil
}

func SaveFile(fileHeader *multipart.FileHeader, folder string) (*SavedFile, error) {
	if fileHeader == nil {
		return nil, fmt.Errorf("file tidak ditemukan")
	}

	// Cek ekstensi file
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if !checkExtAllowed(ext) {
		return nil, fmt.Errorf("jenis file %s tidak didukung", fileHeader.Filename)
	}

	// Cek ukuran file
	if fileHeader.Size > int64(sizeLimit*1024*1024) {
		return nil, fmt.Errorf("ukuran file %s melebihi %dMB", fileHeader.Filename, sizeLimit)
	}

	// Buat nama dan path file
	filename := newFileName(fileHeader.Filename)
	relativePath := filepath.Join(uploadFolder, folder, filename)
	filePath := filepath.Join(".", relativePath)

	// Buka file
	src, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("gagal membuka file: %w", err)
	}
	defer src.Close()

	// Simpan file ke path tujuan
	if err := storeFile(src, filePath); err != nil {
		return nil, fmt.Errorf("gagal menyimpan file: %w", err)
	}

	return &SavedFile{
		Path: relativePath,
		Mime: fileHeader.Header.Get("Content-Type"),
		Size: fileHeader.Size,
	}, nil
}

func DeleteFile(filePath string) error {
	// Validasi path untuk keamanan
	if strings.Contains(filePath, "..") {
		return fmt.Errorf("invalid file path")
	}
	
	full := filepath.Clean(filepath.Join(".", filePath))
	
	// Cek apakah file ada
	if _, err := os.Stat(full); os.IsNotExist(err) {
		return nil // File tidak ada, tidak masalah
	} else if err != nil {
		return fmt.Errorf("tidak bisa mengecek file: %w", err)
	}

	// Retry mechanism untuk mengatasi file lock
	maxRetries := 3
	for i := 0; i < maxRetries; i++ {
		err := os.Remove(full)
		if err == nil {
			return nil // Berhasil dihapus
		}
		
		// Jika masih retry tersisa, tunggu sebentar
		if i < maxRetries-1 {
			time.Sleep(time.Millisecond * 100)
		} else {
			return fmt.Errorf("gagal menghapus file setelah %d percobaan: %w", maxRetries, err)
		}
	}
	
	return nil
}

func UpdateFile(c *fiber.Ctx, oldpath string, fieldName string, folder string) (string, error) {
	// Upload file baru terlebih dahulu
	newFilePath, err := UploadFile(c, fieldName, folder)
	if err != nil {
		return "", fmt.Errorf("gagal upload file baru: %w", err)
	}
	
	// Hapus file lama setelah file baru berhasil diupload
	if oldpath != "" {
		// Gunakan goroutine untuk menghapus file lama secara asynchronous
		go func(path string) {
			// Tunggu sebentar untuk memastikan tidak ada proses lain yang menggunakan file
			time.Sleep(time.Millisecond * 200)
			
			maxRetries := 5
			for i := 0; i < maxRetries; i++ {
				if err := DeleteFile(path); err == nil {
					break // Berhasil dihapus
				}
				// Tunggu lebih lama sebelum retry
				time.Sleep(time.Millisecond * 500)
			}
		}(oldpath)
	}
	
	return newFilePath, nil
}

func UploadFileFlex(c *fiber.Ctx, fieldName string, folder string) ([]string, error) {
	form, err := c.MultipartForm()
	if err != nil{
		return nil, err
	}

	files := form.File[fieldName]
	if len(files) == 0 {
		return nil, fmt.Errorf("tidak ada file yang diunggah")
	}

	var uploadedPaths []string

	for _, fileHeader := range files {
		if !checkExtAllowed(filepath.Ext(fileHeader.Filename)) {
			return nil, fmt.Errorf("jenis file %s tidak didukung", fileHeader.Filename)
		}

		if int(fileHeader.Size) > sizeLimit*1024*1024 {
			return nil, fmt.Errorf("ukuran file %s melebihi dari %dMB", fileHeader.Filename, sizeLimit)
		}

		filename := newFileName(fileHeader.Filename)
		relativePath := filepath.Join(uploadFolder, folder, filename)
		filePath := filepath.Join(".",relativePath)

		src, err := fileHeader.Open()
		if err != nil {
			return nil, err
		}
		defer src.Close() // file ditutup

		if err := storeFile(src, filePath); err != nil {
			return nil, err
		}

		uploadedPaths = append(uploadedPaths, relativePath)
	}

	return uploadedPaths, nil
}

func UpdateFileFlex(c *fiber.Ctx, oldpaths []string, fieldName string, folder string) ([]string, error) {
	// Upload file baru terlebih dahulu
	newFilePaths, err := UploadFileFlex(c, fieldName, folder)
	if err != nil {
		return nil, fmt.Errorf("gagal upload file baru: %w", err)
	}
	
	// Hapus file lama secara asynchronous
	if len(oldpaths) > 0 {
		go func(paths []string) {
			time.Sleep(time.Millisecond * 200)
			
			for _, oldpath := range paths {
				maxRetries := 5
				for i := 0; i < maxRetries; i++ {
					if err := DeleteFile(oldpath); err == nil {
						break
					}
					time.Sleep(time.Millisecond * 500)
				}
			}
		}(oldpaths)
	}
	
	return newFilePaths, nil
}

// --------------------------------------------------------------------------

func checkExtAllowed(ext string) bool {
	return allowed[strings.ToLower(ext)]
}

func newFileName(filename string) string {
	uuidStr := strings.ReplaceAll(uuid.New().String(), "-", "")
	return fmt.Sprintf("%d_%s_%s", time.Now().UnixNano(), uuidStr, filename)
}

func storeFile(src io.Reader, path string) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, os.ModePerm); err != nil {
		return fmt.Errorf("gagal membuat direktori: %w", err)
	}

	dst, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("gagal membuat file: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		// Jika gagal copy, hapus file yang sudah dibuat
		os.Remove(path)
		return fmt.Errorf("gagal menyalin file: %w", err)
	}

	// Sync untuk memastikan data benar-benar tertulis ke disk
	if err := dst.Sync(); err != nil {
		return fmt.Errorf("gagal sync file: %w", err)
	}

	return nil
}