# WebRTC Configuration Validation Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "WebRTC Configuration Validation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$errors = 0
$warnings = 0

function Test-FileExists {
    param($path, $description)
    if (Test-Path $path) {
        Write-Host "[OK] $description" -ForegroundColor Green
        return $true
    } else {
        Write-Host "[MISSING] $description" -ForegroundColor Red
        $script:errors++
        return $false
    }
}

Write-Host "Checking Backend Configuration..." -ForegroundColor Yellow
Test-FileExists "dashboard\src\main\resources\application-prod.yml" "Backend production config"

Write-Host ""
Write-Host "Checking Frontend Configuration..." -ForegroundColor Yellow
Test-FileExists "recruitment_frontend\src\config\webrtc.config.js" "WebRTC config utility"
Test-FileExists "recruitment_frontend\.env.development" "Development environment"
Test-FileExists "recruitment_frontend\.env.production" "Production environment"
Test-FileExists "recruitment_frontend\.env.example" "Example environment"
Test-FileExists "recruitment_frontend\.gitignore" "Frontend gitignore"

Write-Host ""
Write-Host "Checking Infrastructure..." -ForegroundColor Yellow
Test-FileExists "deploy\nginx\dashboard.conf" "Nginx configuration"
Test-FileExists "deploy\turnserver.conf.sample" "coturn template"

Write-Host ""
Write-Host "Checking Documentation..." -ForegroundColor Yellow
Test-FileExists "WEBRTC_SETUP.md" "Setup guide"
Test-FileExists "WEBRTC_QUICK_REFERENCE.md" "Quick reference"
Test-FileExists "WEBRTC_CONFIGURATION_SUMMARY.md" "Configuration summary"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($errors -eq 0) {
    Write-Host "SUCCESS: All checks passed!" -ForegroundColor Green
} else {
    Write-Host "FAILED: $errors file(s) missing" -ForegroundColor Red
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
