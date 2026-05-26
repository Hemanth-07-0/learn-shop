@echo off
REM LearnShop Payment System - Quick Setup Script for Windows

echo.
echo 🚀 LearnShop Payment System - Setup Guide
echo ==========================================
echo.

REM Check if node is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

echo.
echo ✅ Dependencies installed!
echo.
echo 📋 Next Steps:
echo 1. Create .env file with your Razorpay credentials:
echo    - Get keys from: https://dashboard.razorpay.com/app/settings/api-keys
echo    - Copy .env.example to .env
echo    - Fill in your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
echo.
echo 2. Start the server:
echo    npm start          (production)
echo    npm run dev        (development with auto-reload)
echo.
echo 3. Open in browser:
echo    http://localhost:3000/login.html
echo.
echo 4. Test payment:
echo    - Create account
echo    - Select course
echo    - Use test card: 4111111111111111 (Razorpay test mode)
echo.
echo 📚 For detailed setup: Read README_PAYMENT_SYSTEM.md
echo.
pause
