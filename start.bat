@echo off
echo 🎼 Starting Tab Orchestra Server...

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js to run the server.
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is not installed. Please install npm to run the server.
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules\" (
    echo 📦 Installing dependencies...
    npm install
)

REM Start the server
echo 🚀 Starting WebSocket server on port 8080...
node server.js
pause
