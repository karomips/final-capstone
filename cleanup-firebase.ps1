# Appwrite Migration Cleanup Script (PowerShell)
# This script removes old Firebase files after verifying Appwrite is working

Write-Host "🧹 Appwrite Migration Cleanup" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  WARNING: This will remove Firebase files permanently!" -ForegroundColor Yellow
Write-Host "Make sure Appwrite is working correctly before running this." -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Are you sure you want to continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "Cleanup cancelled." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Starting cleanup..." -ForegroundColor Green
Write-Host ""

# Remove Firebase config
$firebaseConfig = "frontend\src\firebase\config.js"
if (Test-Path $firebaseConfig) {
    Write-Host "✓ Removing $firebaseConfig" -ForegroundColor Green
    Remove-Item $firebaseConfig -Force
}

# Remove Firebase directory if empty
$firebaseDir = "frontend\src\firebase"
if (Test-Path $firebaseDir) {
    $items = Get-ChildItem $firebaseDir
    if ($items.Count -eq 0) {
        Write-Host "✓ Removing $firebaseDir directory" -ForegroundColor Green
        Remove-Item $firebaseDir -Force
    } else {
        Write-Host "  Directory not empty, skipped" -ForegroundColor Yellow
    }
}

# Remove Firebase service account key
$serviceKey = "backend\config\serviceAccountKey.json"
if (Test-Path $serviceKey) {
    Write-Host "✓ Removing $serviceKey" -ForegroundColor Green
    Remove-Item $serviceKey -Force
}

# Uninstall Firebase packages
Write-Host ""
Write-Host "Uninstalling Firebase packages..." -ForegroundColor Cyan
Write-Host ""

Write-Host "✓ Uninstalling firebase from frontend..." -ForegroundColor Green
Set-Location frontend
npm uninstall firebase 2>$null
Set-Location ..

Write-Host "✓ Uninstalling firebase-admin from backend..." -ForegroundColor Green
Set-Location backend
npm uninstall firebase-admin 2>$null
Set-Location ..

Write-Host ""
Write-Host "✅ Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Firebase files and packages have been removed."
Write-Host "Your application now uses Appwrite exclusively."
