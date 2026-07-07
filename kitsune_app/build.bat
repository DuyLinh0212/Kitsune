@echo off
chcp 65001 >nul
echo ============================================
echo   Kitsune App - Build Script
echo ============================================
echo.

cd /d "%~dp0"

echo [1/3] Flutter pub get...
call F:\NgDuyLinh\flutter\bin\flutter.bat pub get
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] flutter pub get failed!
    echo Make sure Flutter is installed at F:\NgDuyLinh\flutter\
    pause
    exit /b 1
)

echo.
echo [2/3] Flutter analyze...
call F:\NgDuyLinh\flutter\bin\flutter.bat analyze
if %errorlevel% neq 0 (
    echo.
    echo [WARN] Analyze found issues, continuing anyway...
)

echo.
echo [3/3] Build APK (debug)...
call F:\NgDuyLinh\flutter\bin\flutter.bat build apk --debug
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Build SUCCESS!
echo   APK: build\app\outputs\flutter-apk\app-debug.apk
echo ============================================
pause
