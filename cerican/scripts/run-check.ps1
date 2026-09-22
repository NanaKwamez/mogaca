<#
scripts/run-check.ps1
Interactive local helper to run the report generation + publish check.
- Prompts for SUPABASE_URL and SUPABASE_KEY locally (you type them; they are not sent anywhere).
- Prompts for classId and termId.
- Installs deps if needed, runs the check script, captures output to .\check-run.log
- Opens the log file at the end for you to inspect/paste here.

Usage: Open PowerShell, cd to the project root and run: .\scripts\run-check.ps1
#>

param(
  [string]$SupabaseUrl,
  [string]$SupabaseKey,
  [string]$ClassId,
  [string]$TermId
)

function PromptIfEmpty([string]$name, [string]$current) {
  if ([string]::IsNullOrWhiteSpace($current)) {
    return Read-Host -Prompt "Enter $name"
  }
  return $current
}

# Ensure running from project root
if (-not (Test-Path -Path "./package.json")) {
  Write-Host "Please run this script from the project root where package.json is located." -ForegroundColor Yellow
  exit 1
}

$SupabaseUrl = PromptIfEmpty 'SUPABASE_URL' $SupabaseUrl
$SupabaseKey = PromptIfEmpty 'SUPABASE_KEY (service_role)' $SupabaseKey
$ClassId = PromptIfEmpty 'classId' $ClassId
$TermId = PromptIfEmpty 'termId' $TermId

if ([string]::IsNullOrWhiteSpace($SupabaseUrl) -or [string]::IsNullOrWhiteSpace($SupabaseKey)) {
  Write-Host "Supabase URL and Key are required. Exiting." -ForegroundColor Red
  exit 1
}

# Export env vars for this PowerShell session
$env:SUPABASE_URL = $SupabaseUrl
$env:SUPABASE_KEY = $SupabaseKey

Write-Host "Installing dependencies (if needed)..." -ForegroundColor Cyan
npm install --no-audit --no-fund 2>&1

$log = Join-Path -Path (Get-Location) -ChildPath "check-run.log"
if (Test-Path $log) { Remove-Item $log -Force }

Write-Host "Running check script: scripts/check-report-publish.ts" -ForegroundColor Cyan
$npxCmd = "npx ts-node scripts/check-report-publish.ts $ClassId $TermId"
Write-Host "Command: $npxCmd" -ForegroundColor DarkCyan

# Run and tee output to the log
Invoke-Expression "$npxCmd 2>&1 | Tee-Object -FilePath '$log'"

Write-Host "\n----- LOG FILE: $log -----" -ForegroundColor Green
Get-Content $log -Tail 200 | Write-Host

Write-Host "If there are errors, please copy the contents of $log and paste them in the chat so I can diagnose further." -ForegroundColor Yellow

# Offer to open the log file in your default editor
if (Read-Host "Open log in default editor? (y/N)") -match '^(y|yes)$' {
  Start-Process $log
}
