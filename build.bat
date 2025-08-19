@echo off
REM QuantumXfer Enterprise Build Script for Windows
REM This script builds installable packages for Windows and Linux

setlocal enabledelayedexpansion

echo.
echo 🚀 QuantumXfer Enterprise Build Script
echo ======================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] package.json not found. Please run this script from the project root.
    exit /b 1
)

REM Check if electron-builder is installed
npm list electron-builder --depth=0 >nul 2>&1
if errorlevel 1 (
    echo [ERROR] electron-builder not found. Please run 'npm install' first.
    exit /b 1
)

echo [STEP] Checking system requirements...

REM Check Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [SUCCESS] Node.js version %NODE_VERSION% detected

REM Check npm version
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [SUCCESS] npm version %NPM_VERSION% detected

echo [STEP] Installing dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] npm install failed
    exit /b 1
)

echo [STEP] Building React application...
call npm run build
if errorlevel 1 (
    echo [ERROR] React build failed
    exit /b 1
)

if not exist "dist" (
    echo [ERROR] Build failed. dist directory not found.
    exit /b 1
)

echo [SUCCESS] React build completed successfully

REM Parse command line arguments
set BUILD_TARGET=all
set SKIP_CLEANUP=false

:parse_args
if "%~1"=="" goto :done_parsing
if "%~1"=="--target" (
    set BUILD_TARGET=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--skip-cleanup" (
    set SKIP_CLEANUP=true
    shift
    goto :parse_args
)
if "%~1"=="--help" (
    echo Usage: %0 [options]
    echo.
    echo Options:
    echo   --target ^<target^>     Build target: all, windows, linux ^(default: all^)
    echo   --skip-cleanup        Skip cleanup of dist-electron directory
    echo   --help               Show this help message
    echo.
    echo Examples:
    echo   %0                    # Build for all platforms
    echo   %0 --target windows   # Build for Windows only
    echo   %0 --target linux     # Build for Linux only
    exit /b 0
)
echo [ERROR] Unknown option: %~1
echo Use --help for usage information
exit /b 1

:done_parsing

REM Cleanup previous builds
if "%SKIP_CLEANUP%"=="false" (
    if exist "dist-electron" (
        echo [STEP] Cleaning previous builds...
        rmdir /s /q "dist-electron"
        echo [SUCCESS] Cleanup completed
    )
)

REM Create assets directory if it doesn't exist
if not exist "assets" (
    echo [WARNING] Assets directory not found. Creating placeholder...
    mkdir assets
    
    echo # Placeholder Icons > assets\README.md
    echo. >> assets\README.md
    echo This directory contains placeholder icon files. >> assets\README.md
    echo Replace these with actual icons for production builds. >> assets\README.md
    echo. >> assets\README.md
    echo Required icons: >> assets\README.md
    echo - icon.ico ^(Windows^) >> assets\README.md
    echo - icon.png ^(Linux^) >> assets\README.md
    echo - icon.icns ^(macOS^) >> assets\README.md
    
    echo [WARNING] Please add proper icon files to the assets directory
)

REM Build based on target
if "%BUILD_TARGET%"=="all" (
    echo [STEP] Building for all platforms...
    
    echo [STEP] Building Windows packages...
    call npm run electron:build:win
    if errorlevel 1 (
        echo [ERROR] Windows build failed
        exit /b 1
    )
    echo [SUCCESS] Windows build completed
    
    echo [STEP] Building Linux packages...
    call npm run electron:build:linux
    if errorlevel 1 (
        echo [ERROR] Linux build failed
        exit /b 1
    )
    echo [SUCCESS] Linux build completed
    
) else if "%BUILD_TARGET%"=="windows" (
    echo [STEP] Building Windows packages...
    call npm run electron:build:win
    if errorlevel 1 (
        echo [ERROR] Windows build failed
        exit /b 1
    )
    echo [SUCCESS] Windows build completed
    
) else if "%BUILD_TARGET%"=="linux" (
    echo [STEP] Building Linux packages...
    call npm run electron:build:linux
    if errorlevel 1 (
        echo [ERROR] Linux build failed
        exit /b 1
    )
    echo [SUCCESS] Linux build completed
    
) else (
    echo [ERROR] Invalid target: %BUILD_TARGET%
    echo Valid targets: all, windows, linux
    exit /b 1
)

REM Display build results
echo [STEP] Build Summary
echo ==============
echo.

if exist "dist-electron" (
    echo 📦 Generated packages:
    echo.
    
    REM List all generated files
    for %%f in (dist-electron\*.exe dist-electron\*.deb dist-electron\*.rpm dist-electron\*.AppImage dist-electron\*.tar.gz) do (
        if exist "%%f" (
            for %%a in ("%%f") do (
                echo   📋 %%~nxa
            )
        )
    )
    
    echo.
    echo [SUCCESS] All builds completed successfully!
    echo.
    echo 📁 Packages location: .\dist-electron\
    echo.
    echo 🚀 Ready for distribution!
    echo.
    echo Next steps:
    echo   1. Test the packages on target systems
    echo   2. Sign the packages for production ^(if needed^)
    echo   3. Upload to release channels
    echo   4. Update documentation with download links
    
) else (
    echo [ERROR] No packages were generated. Check the build output for errors.
    exit /b 1
)

echo.
echo 📖 Documentation:
echo   Installation Guide: .\INSTALLATION.md
echo   Startup Guide: .\STARTUP-GUIDE.md
echo.

echo [SUCCESS] Build script completed successfully! 🎉

pause
