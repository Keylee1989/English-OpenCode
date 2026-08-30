# Generates PWA icons for English360 GPT using GDI+ (System.Drawing).
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1
# Output: public/icons/*.png and public/apple-touch-icon.png

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "public\icons"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$bg = [System.Drawing.Color]::FromArgb(255, 37, 99, 235)     # #2563eb
$accent = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 251, 191, 36))

function New-Icon {
    param(
        [int]$Size,
        [string]$Path,
        [double]$TextScale = 1.0
    )

    $isMaskable = $TextScale -lt 1.0

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    try {
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
        $g.Clear($bg)

        $fontSize = [double]$Size * 0.34 * $TextScale
        $font = New-Object System.Drawing.Font("Segoe UI", [float]$fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $format = New-Object System.Drawing.StringFormat
        $format.Alignment = [System.Drawing.StringAlignment]::Center
        $format.LineAlignment = [System.Drawing.StringAlignment]::Center

        # For maskable icons keep content within the inner safe zone.
        if ($isMaskable) {
            $inset = $Size * 0.20
            $dotR = [double]$Size * 0.055
            $dotX = [double]$Size * 0.78
            $dotY = [double]$Size * 0.22
        }
        else {
            $inset = $Size * 0.04
            $dotR = [double]$Size * 0.07
            $dotX = [double]$Size * 0.90
            $dotY = [double]$Size * 0.10
        }

        $rect = New-Object System.Drawing.RectangleF([float]$inset, [float]$inset, [float]($Size - 2 * $inset), [float]($Size - 2 * $inset))
        $g.DrawString("E3", $font, $brush, $rect, $format)

        # Accent dot (top-right)
        $g.FillEllipse($accent, [float]($dotX - $dotR), [float]($dotY - $dotR), [float](2 * $dotR), [float](2 * $dotR))
    }
    finally {
        $g.Dispose()
    }

    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "wrote $Path ($Size x $Size)"
}

New-Icon -Size 192 -Path (Join-Path $outDir "icon-192.png")
New-Icon -Size 512 -Path (Join-Path $outDir "icon-512.png")
New-Icon -Size 192 -Path (Join-Path $outDir "icon-maskable-192.png") -TextScale 0.62
New-Icon -Size 512 -Path (Join-Path $outDir "icon-maskable-512.png") -TextScale 0.62
New-Icon -Size 180 -Path (Join-Path $root "public\apple-touch-icon.png")

Write-Output "done."
