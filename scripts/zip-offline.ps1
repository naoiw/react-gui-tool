param(
  [Parameter(Mandatory = $true)][string]$BundleDir,
  [Parameter(Mandatory = $true)][string]$ZipPath
)
$ErrorActionPreference = 'Stop'
Compress-Archive -Path (Join-Path $BundleDir '*') -DestinationPath $ZipPath -Force
if (-not (Test-Path -LiteralPath $ZipPath -PathType Leaf)) {
  throw "ZIP creation failed: $ZipPath"
}
