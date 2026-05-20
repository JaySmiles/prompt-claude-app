Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param (
        [string]$sourcePath,
        [string]$outputPath,
        [int]$width,
        [int]$height
    )
    try {
        $srcImg = [System.Drawing.Image]::FromFile($sourcePath)
        $destImg = New-Object System.Drawing.Bitmap($width, $height)
        $g = [System.Drawing.Graphics]::FromImage($destImg)
        
        # Configure high quality resizing
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        
        # Clear with transparent background (in case of padding)
        $g.Clear([System.Drawing.Color]::Transparent)
        
        $g.DrawImage($srcImg, 0, 0, $width, $height)
        
        # Ensure directory exists
        $dir = Split-Path $outputPath -Parent
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Force -Path $dir | Out-Null
        }
        
        # Overwrite existing if any
        if (Test-Path $outputPath) {
            Remove-Item $outputPath -Force
        }
        
        $destImg.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        $g.Dispose()
        $destImg.Dispose()
        $srcImg.Dispose()
        Write-Host "Generated: $outputPath ($($width)x$($height))"
    } catch {
        Write-Error "Failed to resize $sourcePath to $outputPath : $_"
    }
}

$sourceJpg = "C:\Users\joshu\.gemini\antigravity\brain\58266400-9528-4612-bd28-ce872d5f71c4\media__1779283440829.jpg"
$baseDir = "b:\Antigravity"

# 1. Create resources directory and save master icon.png
$masterIcon = "$baseDir\resources\icon.png"
Write-Host "Creating master icon from source JPG..."
Resize-Image -sourcePath $sourceJpg -outputPath $masterIcon -width 1024 -height 1024

# 2. Generate web/PWA logo
Write-Host "Generating web logo..."
Resize-Image -sourcePath $masterIcon -outputPath "$baseDir\public\logo.png" -width 512 -height 512

# 3. Generate Android mipmap launcher icons
$androidResources = @{
    "mipmap-mdpi"    = @{ "icon" = 48;  "foreground" = 108 }
    "mipmap-hdpi"    = @{ "icon" = 72;  "foreground" = 162 }
    "mipmap-xhdpi"   = @{ "icon" = 96;  "foreground" = 216 }
    "mipmap-xxhdpi"  = @{ "icon" = 144; "foreground" = 324 }
    "mipmap-xxxhdpi" = @{ "icon" = 192; "foreground" = 432 }
}

# Generate in checked-in resources/android folder for CI/CD pipeline
Write-Host "Generating launcher icons in resources/android/..."
foreach ($folder in $androidResources.Keys) {
    $sizes = $androidResources[$folder]
    $iconSize = $sizes["icon"]
    $fgSize = $sizes["foreground"]
    
    $resFolder = "$baseDir\resources\android\$folder"
    
    # Normal launcher icon
    Resize-Image -sourcePath $masterIcon -outputPath "$resFolder\ic_launcher.png" -width $iconSize -height $iconSize
    # Round launcher icon
    Resize-Image -sourcePath $masterIcon -outputPath "$resFolder\ic_launcher_round.png" -width $iconSize -height $iconSize
    # Foreground launcher icon
    Resize-Image -sourcePath $masterIcon -outputPath "$resFolder\ic_launcher_foreground.png" -width $fgSize -height $fgSize
}

# 4. If local android folder exists, copy generated resources into it
$localResDir = "$baseDir\android\app\src\main\res"
if (Test-Path $localResDir) {
    Write-Host "Local android directory found! Copying resources to android/app/src/main/res/..."
    foreach ($folder in $androidResources.Keys) {
        $srcFolder = "$baseDir\resources\android\$folder"
        $destFolder = "$localResDir\$folder"
        
        if (!(Test-Path $destFolder)) {
            New-Item -ItemType Directory -Force -Path $destFolder | Out-Null
        }
        
        Copy-Item -Path "$srcFolder\*" -Destination $destFolder -Force
        Write-Host "Copied $folder icons to local android project."
    }
}

Write-Host "Icon generation completed successfully!"
