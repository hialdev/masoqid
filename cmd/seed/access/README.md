# Permission Seeder

Seeder khusus untuk membuat/update permissions saja tanpa menyentuh roles atau users.

## Cara Menggunakan

### 1. Jalankan Seeder

```bash
cd minback
go run cmd/seed/access/main.go
```

### 2. Output

Seeder akan:

- ✅ Scan semua ACL dari route files
- ✅ Membuat permission baru jika belum ada
- ⏭️ Skip permission yang sudah ada (tidak duplikat)
- 📊 Menampilkan statistik hasil seeding

### 3. Contoh Output

```
🔍 ACL ditemukan: [Read User Add User Update User Delete User Read Office ...]
📊 Total: 25 permissions

➕ Permission ditambahkan: Read Attendance
➕ Permission ditambahkan: Add Attendance
⏭️  Permission sudah ada: Read User
⏭️  Permission sudah ada: Add User
...

==================================================
✅ Seeding permissions selesai!
📈 Statistik:
   - Ditambahkan: 5 permissions
   - Dilewati (sudah ada): 20 permissions
   - Total: 25 permissions
==================================================
```

## Perbedaan dengan URP Seeder

| Fitur                      | URP Seeder | Access Seeder |
| -------------------------- | ---------- | ------------- |
| Create Permissions         | ✅         | ✅            |
| Create Roles               | ✅         | ❌            |
| Create Users               | ✅         | ❌            |
| Assign Permissions to Role | ✅         | ❌            |
| Skip Duplicate Permissions | ✅         | ✅            |

## Kapan Menggunakan

- **Access Seeder**: Ketika hanya ingin update permissions setelah menambah route baru
- **URP Seeder**: Ketika setup awal atau ingin reset semua (user, role, permission)

## Route Files yang Di-scan

Seeder akan otomatis scan ACL dari:

- `modules/cms/routes/api.go`
- `modules/auth/routes/api.go`

Jika menambah route file baru, tambahkan di array `files` pada `main.go`.
