param(
  [Parameter(Mandatory=$true)] [string]$Hero,
  [string]$About1,
  [string]$About2,
  [string[]]$Menu,
  [string]$OutDir = ".\images"
)

function Test-Cmd($name){ try { Get-Command $name -ErrorAction Stop | Out-Null; $true } catch { $false } }

if (!(Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

if (!(Test-Cmd "magick")) { Write-Error "ImageMagick (magick) が見つかりません。インストールして PATH を通してください。"; exit 1 }

function Make-Hero($src){
  $sizes = @(
    @{w=2560;h=1440; name="hero-2560.jpg"},
    @{w=1920;h=1080; name="hero-1920.jpg"},
    @{w=1280;h=720;  name="hero-1280.jpg"}
  )
  foreach($s in $sizes){
    $out = Join-Path $OutDir $s.name
    & magick $src -strip -colorspace sRGB -resize "$($s.w)x$($s.h)^" -gravity center -extent "$($s.w)x$($s.h)" -quality 82 $out
    Write-Host "✓ $out"
  }
  Copy-Item (Join-Path $OutDir "hero-1920.jpg") (Join-Path $OutDir "hero.jpg") -Force
  Write-Host "✓ $(Join-Path $OutDir 'hero.jpg')"

  & magick (Join-Path $OutDir "hero-1920.jpg") -resize "1200x630^" -gravity center -extent "1200x630" -quality 85 (Join-Path $OutDir "ogp.jpg")
  Write-Host "✓ $(Join-Path $OutDir 'ogp.jpg')"

  if (Test-Cmd "cwebp") {
    & cwebp -q 80 (Join-Path $OutDir "hero-1280.jpg") -o (Join-Path $OutDir "hero-1280.webp") | Out-Null
    & cwebp -q 80 (Join-Path $OutDir "hero-1920.jpg") -o (Join-Path $OutDir "hero-1920.webp") | Out-Null
    Write-Host "✓ WebP 出力 (hero-1280.webp / hero-1920.webp)"
  } else { Write-Warning "cwebp が見つかりません。WebP はスキップします。" }

  if (Test-Cmd "avifenc") {
    & avifenc --min 24 --max 34 --speed 6 (Join-Path $OutDir "hero-1280.jpg") (Join-Path $OutDir "hero-1280.avif") | Out-Null
    & avifenc --min 24 --max 34 --speed 6 (Join-Path $OutDir "hero-1920.jpg") (Join-Path $OutDir "hero-1920.avif") | Out-Null
    & avifenc --min 24 --max 34 --speed 6 (Join-Path $OutDir "hero-2560.jpg") (Join-Path $OutDir "hero-2560.avif") | Out-Null
    Write-Host "✓ AVIF 出力 (hero-*.avif)"
  } else { Write-Warning "avifenc が見つかりません。AVIF はスキップします。" }
}

function Make-About($src, $index){
  if (!$src) { return }
  $out = Join-Path $OutDir ("about-{0}.jpg" -f $index)
  & magick $src -strip -colorspace sRGB -resize "1200x800^" -gravity center -extent "1200x800" -quality 82 $out
  Write-Host "✓ $out"
}

function Make-Square($src, $index){
  if (!$src) { return }
  $out = Join-Path $OutDir ("menu-{0}.jpg" -f $index)
  & magick $src -strip -colorspace sRGB -resize "800x800^" -gravity center -extent "800x800" -quality 82 $out
  Write-Host "✓ $out"
}

Write-Host "== 生成開始 =="
Make-Hero $Hero
Make-About $About1 1
Make-About $About2 2
if ($Menu) {
  $i = 1
  foreach ($m in $Menu) { if ($i -gt 4) { break } Make-Square $m $i; $i++ }
}
Write-Host "== 完了: 出力先 $OutDir =="
