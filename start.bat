@echo off
title AI ICU Guardian
echo ============================================
echo    AI ICU Guardian - Starting Up...
echo ============================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed. Install it from https://python.org
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Install it from https://nodejs.org
    pause
    exit /b 1
)

:: Install Python dependencies
echo [1/4] Installing Python dependencies...
pip install -r requirements.txt --quiet

:: Install frontend dependencies
echo [2/4] Installing frontend dependencies...
cd frontend
if not exist node_modules (
    call npm install
) else (
    echo      node_modules exists, skipping...
)
cd ..

:: Start backend in background
echo [3/4] Starting backend (port 8000)...
start /B "Backend" cmd /c "python -m uvicorn backend.main:app --port 8000 2>&1"

:: Wait for backend to be ready
timeout /t 3 /nobreak >nul

:: Start frontend
echo [4/4] Starting frontend...
cd frontend
start /B "Frontend" cmd /c "npm run dev -- --host 2>&1"
cd ..

:: Wait and open browser
timeout /t 4 /nobreak >nul

echo.
echo ============================================
echo    AI ICU Guardian is running!
echo.
echo    Frontend:  http://localhost:5173
echo    Backend:   http://localhost:8000
echo    API Docs:  http://localhost:8000/docs
echo.
echo    Press Ctrl+C or close this window to stop.
echo ============================================
echo.

start http://localhost:5173

:: Keep window open
pause
