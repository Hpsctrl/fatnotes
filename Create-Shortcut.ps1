param(
  [string]$ShortcutName = "Notes Maker",
  [string]$ShortcutDir  = ""
)

if ([string]::IsNullOrEmpty($ShortcutDir)) {
  $ShortcutDir = [Environment]::GetFolderPath("Desktop")
  if ([string]::IsNullOrEmpty($ShortcutDir)) {
    $ShortcutDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  }
}

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root        = Split-Path -Parent $MyInvocation.MyCommand.Path
$target      = Join-Path $env:WINDIR "System32\wscript.exe"
$launcherVbs = Join-Path $root "Launch-App.vbs"

if (-not (Test-Path $launcherVbs)) {
  throw "Launch-App.vbs not found. Ensure all launcher files exist in $root."
}
if (-not (Test-Path $target)) {
  throw "Could not find wscript.exe at $target"
}

$icoPath      = Join-Path $root "app-logo.ico"
$iconLocation = "$target,0"

$pngCandidates = @(
  (Join-Path $root "public\my-logo.png"),
  (Join-Path $root "public\favicon.png"),
  (Join-Path $root "public\logo.png"),
  (Join-Path $root "my-logo.png"),
  (Join-Path $root "favicon.png")
) | Where-Object { $_ -and (Test-Path $_) }
$pngCandidates = @($pngCandidates)

if ($pngCandidates.Count -gt 0) {
  $candidate = $pngCandidates[0]
  try {
    Add-Type -AssemblyName System.Drawing | Out-Null
    $sizes    = @(256, 48, 32, 16)
    $pngBlobs = New-Object System.Collections.Generic.List[byte[]]
    $src      = [System.Drawing.Image]::FromFile($candidate)
    try {
      foreach ($size in $sizes) {
        $bmp = New-Object System.Drawing.Bitmap $size, $size
        $g   = [System.Drawing.Graphics]::FromImage($bmp)
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $g.DrawImage($src, 0, 0, $size, $size)
        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $pngBlobs.Add($ms.ToArray()) | Out-Null
        $ms.Dispose(); $g.Dispose(); $bmp.Dispose()
      }
    } finally { $src.Dispose() }
    $count = $pngBlobs.Count; $offset = 6 + (16 * $count)
    $fs = [System.IO.File]::Open($icoPath, [System.IO.FileMode]::Create,
           [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    $bw = New-Object System.IO.BinaryWriter($fs)
    $bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]$count)
    for ($i = 0; $i -lt $count; $i++) {
      $sz = [int]$sizes[$i]; $bytes = $pngBlobs[$i]; $wh = if ($sz -ge 256) { 0 } else { $sz }
      $bw.Write([byte]$wh); $bw.Write([byte]$wh); $bw.Write([byte]0); $bw.Write([byte]0)
      $bw.Write([UInt16]0); $bw.Write([UInt16]32)
      $bw.Write([UInt32]$bytes.Length); $bw.Write([UInt32]$offset)
      $offset += $bytes.Length
    }
    foreach ($bytes in $pngBlobs) { $bw.Write($bytes) }
    $bw.Flush(); $bw.Dispose(); $fs.Dispose()
    $iconLocation = "$icoPath,0"
    Write-Host "Icon generated from: $candidate"
  } catch {
    Write-Warning "Could not convert image to ICO: $($_.Exception.Message). Using default icon."
  }
}

$shortcutPath = Join-Path $ShortcutDir ($ShortcutName + ".lnk")
$wsh = New-Object -ComObject WScript.Shell
$sc  = $wsh.CreateShortcut($shortcutPath)
$sc.TargetPath       = $target
$sc.Arguments        = "`"$launcherVbs`""
$sc.WorkingDirectory = $root
$sc.IconLocation     = $iconLocation
$sc.Save()

Write-Host "Shortcut created: $shortcutPath"
Write-Host "Icon:             $iconLocation"
