param(
  [Parameter(Mandatory = $true)][string]$BundleRoot
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $BundleRoot).ProviderPath
$serverScript = Join-Path $root 'scripts\serve-dist.ps1'
$indexFile = Join-Path $root 'dist\index.html'
$jsFile = Get-ChildItem -LiteralPath (Join-Path $root 'dist\assets') -Filter '*.js' -File | Select-Object -First 1
if (-not (Test-Path -LiteralPath $indexFile -PathType Leaf) -or $null -eq $jsFile) {
  throw 'Offline bundle is missing index.html or JavaScript assets'
}
$port = Get-Random -Minimum 40000 -Maximum 60000
$job = Start-Job -ScriptBlock {
  param($script, $webRoot, $port)
  & $script -Root $webRoot -Port $port -NoBrowser
} -ArgumentList $serverScript, (Join-Path $root 'dist'), $port
try {
  $baseUrl = "http://127.0.0.1:$port"
  $homeResponse = $null
  for ($i = 0; $i -lt 40; $i++) {
    if ($job.State -eq 'Failed') {
      throw "Server failed to start: $(Receive-Job $job)"
    }
    try {
      $homeResponse = Invoke-WebRequest -UseBasicParsing -Uri "$baseUrl/" -TimeoutSec 2
      break
    }
    catch {
      Start-Sleep -Milliseconds 350
    }
  }
  if ($null -eq $homeResponse -or $homeResponse.StatusCode -ne 200 -or $homeResponse.Content -notmatch '<html') {
    throw 'Offline index.html was not served'
  }
  $asset = Invoke-WebRequest -UseBasicParsing -Uri "$baseUrl/assets/$($jsFile.Name)" -TimeoutSec 5
  if ($asset.StatusCode -ne 200 -or $asset.Headers['Content-Type'] -notmatch 'javascript') {
    throw 'Offline JavaScript asset was not served correctly'
  }
  try {
    Invoke-WebRequest -UseBasicParsing -Uri "$baseUrl/missing.css" -TimeoutSec 3 -ErrorAction Stop
    throw 'Missing file unexpectedly returned 200'
  } catch [System.Net.WebException] {
    if ([int]$_.Exception.Response.StatusCode -ne 404) {
      throw 'Missing file returned unexpected status'
    }
  }
  Write-Host 'Offline server smoke test passed.'
} finally {
  Stop-Job $job -ErrorAction SilentlyContinue
  Remove-Job $job -Force -ErrorAction SilentlyContinue
}
