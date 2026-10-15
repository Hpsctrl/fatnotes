param([int]$Port = 5173)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$url  = "http://localhost:$Port/"

function Test-AppUp {
  param([string]$Url)
  try {
    $null = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    return $true
  } catch {
    return $false
  }
}

function Test-FileLocked {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $false }
  try {
    $file = [System.IO.File]::Open($Path, 'Open', 'Write', 'None')
    $file.Close()
    return $false
  } catch {
    return $true
  }
}

# Clean up any old timestamped log files to keep the directory clean
Get-ChildItem -Path $root -Filter "dev-server.*-*.log" | Where-Object { $_.Name -match "dev-server\.(stdout|stderr)-\d{8}-\d{6}\.log" } | Remove-Item -Force -ErrorAction SilentlyContinue

$stdoutLog = Join-Path $root "dev-server.stdout.log"
$stderrLog = Join-Path $root "dev-server.stderr.log"

if ((Test-FileLocked -Path $stdoutLog) -or (Test-FileLocked -Path $stderrLog)) {
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $stdoutLog = Join-Path $root "dev-server.stdout-$timestamp.log"
  $stderrLog = Join-Path $root "dev-server.stderr-$timestamp.log"
}

if (-not (Test-AppUp -Url $url)) {
  $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev -- --port $Port" `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -PassThru `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog

  $started = $false
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-AppUp -Url $url) {
      $started = $true
      break
    }
  }

  if (-not $started) {
    throw "Notes Maker dev server did not start on $url. Check $stdoutLog and $stderrLog for details."
  }
}

& cmd.exe /c "start `"`" $url" | Out-Null
