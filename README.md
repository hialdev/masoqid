# Masoq.id - Attendance App with Smart Suspicious Detection

![Masoq Logo](https://img.shields.io/badge/Masoq-Attendance%20System-0069cb?style=for-the-badge)
![Go](https://img.shields.io/badge/Go-1.24-00ADD8?style=flat-square&logo=go)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-336791?style=flat-square&logo=postgresql)

Sistem manajemen kehadiran (attendance) dengan deteksi kecurangan otomatis menggunakan AI dan validasi lokasi GPS.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
   - [Windows](#windows)
   - [Linux](#linux)
   - [macOS](#macos)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [Seeding Database](#-seeding-database)
- [API Documentation](#-api-documentation)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

- 🔐 **Secure Authentication** - OTP-based login with JWT tokens
- 📍 **GPS Location Tracking** - Real-time location validation for check-in/out
- 🚨 **Fraud Detection** - Smart detection for location spoofing, photo manipulation, and duplicate photos
- 👥 **User Management** - Role-based access control (RBAC)
- 🏢 **Office Management** - Multiple office locations with radius-based validation
- 📊 **Attendance Reports** - Comprehensive attendance tracking and analytics
- 🔒 **Production-Ready Security** - Auto-sanitize sensitive data in production mode
- 📱 **WhatsApp Integration** - OTP delivery via WhatsApp

---

## 🛠 Tech Stack

### Backend (minback)

- **Language**: Go 1.24
- **Framework**: Fiber v2
- **Database**: PostgreSQL
- **Cache**: Redis
- **ORM**: GORM
- **Authentication**: JWT (golang-jwt/jwt)
- **Validation**: go-playground/validator

### Frontend (minfront)

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI Library**: Material-UI (MUI) v7
- **State Management**: Zustand
- **Data Fetching**: SWR + Axios
- **Forms**: React Hook Form + Zod
- **Node Version**: >=20

---

## 📦 Prerequisites

### All Platforms

#### 1. **Node.js** (>= 20.x)

- **Windows**: Download from [nodejs.org](https://nodejs.org/)
- **Linux**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
- **macOS**:
   ```bash
   brew install node@20
   ```

#### 2. **Go** (>= 1.24)

- **Windows**: Download from [go.dev/dl](https://go.dev/dl/)
- **Linux**:
   ```bash
   wget https://go.dev/dl/go1.24.0.linux-amd64.tar.gz
   sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf go1.24.0.linux-amd64.tar.gz
   export PATH=$PATH:/usr/local/go/bin
   ```
- **macOS**:
   ```bash
   brew install go@1.24
   ```

#### 3. **PostgreSQL** (>= 14)

- **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/windows/)
- **Linux**:
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```
- **macOS**:
   ```bash
   brew install postgresql@14
   brew services start postgresql@14
   ```

#### 4. **Redis** (>= 6.0)

- **Windows**: Download from [redis.io](https://redis.io/download) or use WSL
- **Linux**:
   ```bash
   sudo apt update
   sudo apt install redis-server
   sudo systemctl start redis-server
   sudo systemctl enable redis-server
   ```
- **macOS**:
   ```bash
   brew install redis
   brew services start redis
   ```

#### 5. **Git**

- **Windows**: Download from [git-scm.com](https://git-scm.com/download/win)
- **Linux**: `sudo apt install git`
- **macOS**: `brew install git`

#### 6. **Yarn** (Package Manager for Frontend)

```bash
npm install -g yarn
```

---

## 🚀 Installation

### Windows

#### Step 1: Clone Repository

```powershell
git clone https://github.com/hialdev/masoqid.git
cd masoqid
```

#### Step 2: Setup Database

```powershell
# Login to PostgreSQL (default password: postgres)
psql -U postgres

# Create database and user
CREATE DATABASE ema_hadir;
CREATE USER ema WITH PASSWORD '#EMAuser123';
GRANT ALL PRIVILEGES ON DATABASE ema_hadir TO ema;
\q
```

#### Step 3: Setup Backend (minback)

```powershell
cd minback

# Copy environment file
copy .env.example .env

# Install dependencies
go mod download

# Install Air for hot reload (optional)
go install github.com/air-verse/air@latest

# Run migrations (automatic on first run)
go run cmd/main.go
```

#### Step 4: Setup Frontend (minfront)

```powershell
cd ..\minfront

# Copy environment file
copy .env.example .env

# Install dependencies
yarn install

# Run development server
yarn dev
```

---

### Linux

#### Step 1: Clone Repository

```bash
git clone https://github.com/hialdev/masoqid.git
cd masoqid
```

#### Step 2: Setup Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE ema_hadir;
CREATE USER ema WITH PASSWORD '#EMAuser123';
GRANT ALL PRIVILEGES ON DATABASE ema_hadir TO ema;
\q
```

#### Step 3: Setup Backend (minback)

```bash
cd minback

# Copy environment file
cp .env.example .env

# Install dependencies
go mod download

# Install Air for hot reload (optional)
go install github.com/air-verse/air@latest

# Add Go bin to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH=$PATH:$(go env GOPATH)/bin

# Run migrations (automatic on first run)
go run cmd/main.go
```

#### Step 4: Setup Frontend (minfront)

```bash
cd ../minfront

# Copy environment file
cp .env.example .env

# Install dependencies
yarn install

# Run development server
yarn dev
```

---

### macOS

#### Step 1: Clone Repository

```bash
git clone https://github.com/hialdev/masoqid.git
cd masoqid
```

#### Step 2: Setup Database

```bash
# Create database and user
psql postgres

CREATE DATABASE ema_hadir;
CREATE USER ema WITH PASSWORD '#EMAuser123';
GRANT ALL PRIVILEGES ON DATABASE ema_hadir TO ema;
\q
```

#### Step 3: Setup Backend (minback)

```bash
cd minback

# Copy environment file
cp .env.example .env

# Install dependencies
go mod download

# Install Air for hot reload (optional)
go install github.com/air-verse/air@latest

# Add Go bin to PATH (add to ~/.zshrc)
export PATH=$PATH:$(go env GOPATH)/bin

# Run migrations (automatic on first run)
go run cmd/main.go
```

#### Step 4: Setup Frontend (minfront)

```bash
cd ../minfront

# Copy environment file
cp .env.example .env

# Install dependencies
yarn install

# Run development server
yarn dev
```

---

## ⚙️ Configuration

### Backend (.env)

Edit `minback/.env`:

```env
# App Configuration
APP_NAME="Masoq - Attendance System"
APP_TIMEZONE="Asia/Jakarta"
APP_SECRET="your-secret-key-here"
APP_ENV="development"  # Change to "production" for deployment
APP_HOST="localhost"
APP_PORT="1263"

# Database Configuration
DB_DRIVER=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=ema
DB_PASSWORD="#EMAuser123"
DB_NAME="ema_hadir"

# Redis Configuration
REDIS_ADDR="localhost:6379"
REDIS_PASSWORD=""

# CORS
CORS_ALLOWORIGINS="http://localhost:3001"
CORS_ALLOWMETHODS="GET,POST,DELETE,PATCH"
CORS_ALLOWHEADERS="Origin,Content-Type,Authorization"

# Cookie
COOKIE_DOMAIN=""
COOKIE_HTTPONLY="true"
COOKIE_ACCESSAGE="15"  # minutes
COOKIE_REFRESHAGE="7"  # days
COOKIE_SAMESITE="lax"

# SMTP (for email OTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="your-email@gmail.com"
```

### Frontend (.env)

Edit `minfront/.env`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:1263/api
NEXT_PUBLIC_API_HOST=http://localhost:1263
NEXT_PUBLIC_APP_URL=http://localhost:3001

# JWT Secret (must match backend)
JWT_SECRET="your-secret-key-here"

# Cookie Configuration
NEXT_PUBLIC_COOKIE_DOMAIN=""
NEXT_PUBLIC_COOKIE_HTTPONLY="true"
NEXT_PUBLIC_COOKIE_AGE="15"
NEXT_PUBLIC_COOKIE_SAMESITE="lax"
```

---

## 🏃 Running the Application

### Development Mode

#### Terminal 1: Backend

```bash
cd minback

# With Air (hot reload)
air

# Or without Air
go run cmd/main.go
```

Backend will run on: **http://localhost:1263**

#### Terminal 2: Frontend

```bash
cd minfront
yarn dev
```

Frontend will run on: **http://localhost:3001**

### Production Mode

#### Backend

```bash
cd minback

# Build
go build -o masoq-backend cmd/main.go

# Run
./masoq-backend
```

#### Frontend

```bash
cd minfront

# Build
yarn build

# Start
yarn start
```

---

## 🌱 Seeding Database

### Option 1: Full Seeder (URP - User, Role, Permission)

Creates super admin user, roles, and all permissions:

```bash
cd minback
go run cmd/seed/urp/main.go
```

**Default Super Admin:**

- Username: `hialdev`
- Email: `mna.official12@gmail.com`
- Phone: `+6289671052050`

### Option 2: Permission Only Seeder

Updates permissions only (useful after adding new routes):

```bash
cd minback
go run cmd/seed/access/main.go
```

This will:

- ✅ Scan all ACL from route files
- ✅ Create new permissions
- ⏭️ Skip existing permissions (no duplicates)

---

## 📚 API Documentation

Full API documentation available at:

- **File**: `docs/masoq-apidoc.md`
- **Endpoints**: 50+ endpoints
- **Categories**: Authentication, Users, Roles, Permissions, Offices, Attendance, Settings

### Quick API Test

```bash
# Health check
curl http://localhost:1263/api/auth/test

# Expected response:
{
  "success": true,
  "message": "Auth API is running"
}
```

---

## 🐛 Troubleshooting

### Backend Issues

#### 1. Database Connection Error

```bash
# Check PostgreSQL is running
# Windows
pg_ctl status

# Linux/macOS
sudo systemctl status postgresql
```

#### 2. Redis Connection Error

```bash
# Check Redis is running
# Windows
redis-cli ping

# Linux/macOS
redis-cli ping
# Should return: PONG
```

#### 3. Port Already in Use

```bash
# Find process using port 1263
# Windows
netstat -ano | findstr :1263

# Linux/macOS
lsof -i :1263

# Kill the process
# Windows
taskkill /PID <PID> /F

# Linux/macOS
kill -9 <PID>
```

### Frontend Issues

#### 1. Node Version Error

```bash
# Check Node version
node -v
# Should be >= 20.x

# If not, install Node 20+
nvm install 20
nvm use 20
```

#### 2. Port 3001 Already in Use

```bash
# Change port in package.json
"dev": "next dev -p 3002 --turbopack"
```

#### 3. Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules .next
yarn install
```

### Common Issues

#### CORS Error

Make sure `CORS_ALLOWORIGINS` in backend `.env` includes your frontend URL:

```env
CORS_ALLOWORIGINS="http://localhost:3001"
```

#### Cookie Not Set

1. Check `COOKIE_DOMAIN` is empty for localhost
2. Ensure `COOKIE_HTTPONLY` is set correctly
3. Verify frontend and backend are on same domain/localhost

---

## 📝 License

This project is proprietary software. All rights reserved.

---

## 👥 Contributors

- **Hi AL Dev** - Initial work - [hialdev](https://github.com/hialdev)

---

## 📞 Support

For issues and questions:

- **Email**: mna.official12@gmail.com
- **GitHub Issues**: [Create an issue](https://github.com/hialdev/masoqid/issues)

---

**Made with ❤️ by Hi AL Dev**
