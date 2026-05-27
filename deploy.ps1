# Quick deploy script for chinchilla-jump
# Usage:  .\deploy.ps1
$ErrorActionPreference = "Stop"

$nodeDir = "C:\Users\localadmin\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.16.0-win-x64"
$npmGlobal = "$env:APPDATA\npm"
$env:Path = "$nodeDir;$npmGlobal;$env:Path"

if (-not (Test-Path ".env")) {
  Write-Error ".env file not found. Create it with VERCEL_TOKEN=..."
}

Get-Content .env | ForEach-Object {
  if ($_ -match "^\s*#") { return }
  if ($_ -match "^\s*$") { return }
  $parts = $_.Split("=", 2)
  if ($parts.Length -eq 2) {
    Set-Item "env:$($parts[0].Trim())" $parts[1].Trim()
  }
}

if (-not $env:VERCEL_TOKEN) { Write-Error "VERCEL_TOKEN missing in .env" }
$scope = if ($env:VERCEL_SCOPE) { $env:VERCEL_SCOPE } else { "alizhan-s-projects2" }

Write-Host "Deploying to Vercel (scope: $scope)..." -ForegroundColor Cyan
vercel deploy --prod --yes --scope $scope