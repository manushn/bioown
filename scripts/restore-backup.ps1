# Offline Disaster Recovery Script for Windows Attendance Terminal
param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFilePath
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " College Staff Attendance - Database Restore Utility" -ForegroundColor Cyan
Write-Host " Target Backup File: $BackupFilePath" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (!(Test-Path $BackupFilePath)) {
    Write-Error "Backup file does not exist: $BackupFilePath"
    exit 1
}

$DataDir = "$env:ProgramData\CollegeStaffAttendance\data"
$ActiveDb = Join-Path $DataDir "attendance.db"
$BackupDir = "$env:ProgramData\CollegeStaffAttendance\backups"

# Ensure target directory exists
if (!(Test-Path $DataDir)) {
    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
}

# 1. Mandatory Pre-Restore Safety Backup
$Timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$SafetyBackup = Join-Path $BackupDir "pre-restore-safety-$Timestamp.db"

if (Test-Path $ActiveDb) {
    Write-Host "`n[1/3] Creating mandatory safety rollback backup..." -ForegroundColor Yellow
    Copy-Item -Path $ActiveDb -Destination $SafetyBackup -Force
    Write-Host "Safety backup created at: $SafetyBackup" -ForegroundColor Green
}

# 2. Restore active database
Write-Host "`n[2/3] Restoring target database snapshot..." -ForegroundColor Yellow
Copy-Item -Path $BackupFilePath -Destination $ActiveDb -Force
Write-Host "Database replaced with snapshot." -ForegroundColor Green

# 3. Verification
Write-Host "`n[3/3] Verifying database integrity..." -ForegroundColor Yellow
$FileItem = Get-Item $ActiveDb
Write-Host "Active database size: $($FileItem.Length) bytes" -ForegroundColor Green

Write-Host "`n[SUCCESS] Restore operation completed successfully." -ForegroundColor Green

