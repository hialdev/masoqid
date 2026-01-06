package connection

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

var Redis *redis.Client
var Ctx = context.Background()

func InitRedis() {
	Redis = redis.NewClient(&redis.Options{
		Addr:     os.Getenv("REDIS_ADDR"), // Contoh: "localhost:6379"
		Password: "",                      // Jika tanpa password
		DB:       0,
	})

	_, err := Redis.Ping(Ctx).Result()
	if err != nil {
		panic("Redis connection failed: " + err.Error())
	}else{
		fmt.Println("💞 Redis terhubung!")
	}

}

func SetToken(key, value string, duration time.Duration) error {
	return Redis.Set(Ctx, key, value, duration).Err()
}

func GetToken(key string) (string, error) {
	return Redis.Get(Ctx, key).Result()
}

func DeleteToken(key string) error {
	return Redis.Del(Ctx, key).Err()
}

// ======================
// Generic Redis Functions
// ======================

// Set menyimpan data ke Redis dengan TTL
func Set(key string, value interface{}, expiration time.Duration) error {
	return Redis.Set(Ctx, key, value, expiration).Err()
}

// SetWithCtx sama seperti Set, tapi pakai context dari request
func SetWithCtx(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	return Redis.Set(ctx, key, value, expiration).Err()
}

// Get mengambil data dari Redis
func Get(key string) (string, error) {
	return Redis.Get(Ctx, key).Result()
}

// GetWithCtx pakai context dari request
func GetWithCtx(ctx context.Context, key string) (string, error) {
	return Redis.Get(ctx, key).Result()
}

// Del menghapus key dari Redis
func Del(key string) error {
	return Redis.Del(Ctx, key).Err()
}

// DelWithCtx pakai context
func DelWithCtx(ctx context.Context, key string) error {
	return Redis.Del(ctx, key).Err()
}

// Expire mengatur ulang TTL
func Expire(key string, expiration time.Duration) error {
	return Redis.Expire(Ctx, key, expiration).Err()
}

func DeleteKeysByPattern(ctx context.Context, pattern string) error {
	iter := Redis.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		if err := Redis.Del(ctx, iter.Val()).Err(); err != nil {
			return err
		}
	}
	return iter.Err()
}