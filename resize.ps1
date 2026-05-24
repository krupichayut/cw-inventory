Add-Type -AssemblyName System.Drawing

$sourceFile = "public/app-icon.jpg"
if (-not (Test-Path $sourceFile)) {
    Write-Error "Source file not found!"
    exit 1
}

$img = [System.Drawing.Image]::FromFile($sourceFile)

function Resize-Image($width, $height, $outFile) {
    $bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppRgb)
    $graph = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Fill background with white to remove transparency
    $graph.Clear([System.Drawing.Color]::White)
    
    # High quality resizing
    $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graph.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graph.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graph.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $graph.DrawImage($img, 0, 0, $width, $height)
    $bmp.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graph.Dispose()
    $bmp.Dispose()
    Write-Host "Created $outFile"
}

Resize-Image 192 192 "public/pwa-192x192.png"
Resize-Image 512 512 "public/pwa-512x512.png"
Resize-Image 180 180 "public/apple-touch-icon.png"

$img.Dispose()
Write-Host "All icons resized successfully with white background."
