# Creates the app database (if missing) and runs Prisma migrations.
# Set DATABASE_URL in .env (repo root and/or frontend) to match your Postgres install.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

function Get-DatabaseUrlFromEnv {
  $paths = @(
    (Join-Path $root ".env"),
    (Join-Path $root "frontend\.env")
  )
  foreach ($p in $paths) {
    if (Test-Path $p) {
      $line = Get-Content $p | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1
      if ($line) {
        $val = $line -replace '^\s*DATABASE_URL\s*=\s*', '' -replace '^"|"$', ''
        return $val.Trim()
      }
    }
  }
  throw "DATABASE_URL not found in .env or frontend\.env"
}

$url = Get-DatabaseUrlFromEnv
if ($url -notmatch '^postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)$') {
  throw "Could not parse DATABASE_URL. Expected postgresql://user:pass@host:port/dbname"
}
$dbUser = $Matches[1]
# Decode %xx in password (e.g. %21 for !) for PGPASSWORD / psql
$dbPass = [System.Uri]::UnescapeDataString($Matches[2])
$dbHost = $Matches[3]
$dbPort = $Matches[4]
$dbName = $Matches[5]

$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
if (-not (Test-Path $psql)) {
  $psql = "psql"
}

$env:PGPASSWORD = $dbPass

Write-Host "Checking database '$dbName'..."
$exists = & $psql -U $dbUser -h $dbHost -p $dbPort -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$dbName'"
if ($exists -ne "1") {
  Write-Host "Creating database '$dbName'..."
  & $psql -U $dbUser -h $dbHost -p $dbPort -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE `"$dbName`";"
  Write-Host "Database created."
} else {
  Write-Host "Database already exists."
}

Write-Host "Running Prisma migrate..."
Push-Location (Join-Path $root "frontend")
try {
  npx prisma migrate dev --name init
} finally {
  Pop-Location
}

Write-Host "Done."
