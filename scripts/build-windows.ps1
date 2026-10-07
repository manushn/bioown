# Windows Production Build Script
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Building College Staff Attendance System for Windows" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Install root & subproject npm dependencies
Write-Host "`n[1/4] Installing Node dependencies..." -ForegroundColor Yellow
npm install
npm --prefix apps/local-api install
npm --prefix apps/web install
npm --prefix apps/desktop install

# 2. Build Vite React Frontend
Write-Host "`n[2/4] Building React Web Frontend with Vite..." -ForegroundColor Yellow
npm --prefix apps/web run build

# 3. Build C# MFS100 Bridge
Write-Host "`n[3/4] Building C# MFS100 Bridge..." -ForegroundColor Yellow
if (Get-Command msbuild -ErrorAction SilentlyContinue) {
    msbuild hardware/mfs100-bridge/MFS100Bridge.sln /p:Configuration=Release /p:Platform=x86
} else {
    Write-Warning "MSBuild not found in PATH. Please build hardware/mfs100-bridge/MFS100Bridge.sln using Visual Studio."
}

# 4. Package Electron Application
Write-Host "`n[4/4] Packaging Electron Desktop Installer..." -ForegroundColor Yellow
npm --prefix apps/desktop run build:win

Write-Host "`n[SUCCESS] Windows build process completed!" -ForegroundColor Green

