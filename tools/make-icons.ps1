# Renders the home-screen PNG icons for both apps from the logo images in tools/logos.
# Run (Windows PowerShell): powershell -ExecutionPolicy Bypass -File tools/make-icons.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot

function New-Canvas($size) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  return $bmp, $g
}

# Phantom (nebula/): purple ghost, square crop around the ghost on its flat purple background.
$src = [System.Drawing.Bitmap]::FromFile("$root\tools\logos\phantom.jpg")
foreach ($size in 180, 192, 512) {
  $bmp, $g = New-Canvas $size
  $g.Clear([System.Drawing.Color]::FromArgb(171, 159, 241))
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, $size, $size), (New-Object System.Drawing.Rectangle 302, 80, 420, 420), [System.Drawing.GraphicsUnit]::Pixel)
  $bmp.Save("$root\nebula\icon-$size.png", [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
$src.Dispose()
Write-Host 'nebula (Phantom): icons written'

# Wallet (pocket/): card wallet on a dark full-bleed background (iOS rounds the corners itself).
$src = [System.Drawing.Bitmap]::FromFile("$root\tools\logos\wallet.jpg")
$crop = New-Object System.Drawing.Rectangle 368, 155, 289, 230
foreach ($size in 180, 192, 512) {
  $bmp, $g = New-Canvas $size
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Point 0, 0), (New-Object System.Drawing.Point 0, $size), ([System.Drawing.Color]::FromArgb(33, 33, 33)), ([System.Drawing.Color]::FromArgb(12, 12, 12))
  $g.FillRectangle($bg, 0, 0, $size, $size)
  $w = [int]($size * 0.74); $h = [int]($w * $crop.Height / $crop.Width)
  $dst = New-Object System.Drawing.Rectangle ([int](($size - $w) / 2)), ([int](($size - $h) / 2)), $w, $h
  $g.DrawImage($src, $dst, $crop, [System.Drawing.GraphicsUnit]::Pixel)
  $bmp.Save("$root\pocket\icon-$size.png", [System.Drawing.Imaging.ImageFormat]::Png)
  $bg.Dispose(); $g.Dispose(); $bmp.Dispose()
}
$src.Dispose()
Write-Host 'pocket (Wallet): icons written'
