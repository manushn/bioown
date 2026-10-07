# Windows Auto-Start Installation Script (Kiosk Terminal)
param (
    [string]$AppPath = "$env:ProgramFiles\CollegeStaffAttendance\College Staff Attendance.exe"
)

Write-Host "Configuring Windows Kiosk Auto-Start for: $AppPath" -ForegroundColor Cyan

# Configure Run Key in Windows Registry
$RegPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$AppName = "CollegeStaffAttendance"

try {
    Set-ItemProperty -Path $RegPath -Name $AppName -Value "`"$AppPath`" --kiosk"
    Write-Host "[SUCCESS] Added to Windows Startup Registry key: $RegPath" -ForegroundColor Green
} catch {
    Write-Error "Failed to set registry auto-start: $_"
}

# Ensure ProgramData directories exist
$DataDir = "$env:ProgramData\CollegeStaffAttendance"
$SubDirs = @("data", "backups", "restore-inbox", "restore-inbox\processed", "logs", "config")

foreach ($sub in $SubDirs) {
    $full = Join-Path $DataDir $sub
    if (!(Test-Path $full)) {
        New-Item -ItemType Directory -Path $full -Force | Out-Null
        Write-Host "Created: $full" -ForegroundColor DarkGray
    }
}

Write-Host "[DONE] Kiosk startup environment prepared." -ForegroundColor Green

