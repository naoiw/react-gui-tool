# Windows PowerShell 5.1: serve a prebuilt Vite static site on loopback only.
# No Node.js, Python, network access, or administrator privileges required.
param(
  [Parameter(Mandatory = $true)]
  [string]$Root,
  [ValidateRange(0, 65535)]
  [int]$Port = 0,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

function Send-Response {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$Status,
    [string]$ContentType,
    [byte[]]$Body,
    [bool]$HeadOnly = $false
  )

  $reason = switch ($Status) {
    200 { 'OK' }
    400 { 'Bad Request' }
    403 { 'Forbidden' }
    404 { 'Not Found' }
    405 { 'Method Not Allowed' }
    default { 'Internal Server Error' }
  }

  $newline = [string][char]13 + [char]10
  $headers = "HTTP/1.1 $Status $reason" + $newline +
    "Content-Type: $ContentType" + $newline +
    "Content-Length: $($Body.Length)" + $newline +
    "Cache-Control: no-store" + $newline +
    "X-Content-Type-Options: nosniff" + $newline +
    "Connection: close" + $newline + $newline

  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if (-not $HeadOnly -and $Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
  $Stream.Flush()
}

function Get-ContentType {
  param([string]$Path)
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    '.html' { return 'text/html; charset=utf-8' }
    '.css'  { return 'text/css; charset=utf-8' }
    '.js'   { return 'text/javascript; charset=utf-8' }
    '.mjs'  { return 'text/javascript; charset=utf-8' }
    '.json' { return 'application/json; charset=utf-8' }
    '.txt'  { return 'text/plain; charset=utf-8' }
    '.xml'  { return 'application/xml; charset=utf-8' }
    '.svg'  { return 'image/svg+xml' }
    '.ico'  { return 'image/x-icon' }
    '.png'  { return 'image/png' }
    '.jpg'  { return 'image/jpeg' }
    '.jpeg' { return 'image/jpeg' }
    '.webp' { return 'image/webp' }
    '.gif'  { return 'image/gif' }
    '.woff' { return 'font/woff' }
    '.woff2'{ return 'font/woff2' }
    '.wasm' { return 'application/wasm' }
    '.map'  { return 'application/json' }
    default { return 'application/octet-stream' }
  }
}

$indexFile = Join-Path $Root 'index.html'
if (-not (Test-Path -LiteralPath $indexFile -PathType Leaf)) {
  throw "Vite build is missing: $indexFile"
}

$rootPath = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $Root).ProviderPath)
$rootPrefix = $rootPath.TrimEnd([System.IO.Path]::DirectorySeparatorChar) +
  [System.IO.Path]::DirectorySeparatorChar
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)

try {
  $listener.Start()
  $actualPort = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
  $url = "http://127.0.0.1:$actualPort/"
  Write-Host "React GUI Tool: $url"
  Write-Host 'Open this URL in Chrome or Edge for Web Serial. Press Ctrl+C to stop.'

  if (-not $NoBrowser) {
    try { Start-Process -FilePath $url }
    catch { Write-Warning "Could not open a browser automatically. Open $url manually." }
  }

  while ($true) {
    $client = $listener.AcceptTcpClient()
    $reader = $null
    try {
      $client.ReceiveTimeout = 3000
      $client.SendTimeout = 3000
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)

      $requestLine = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }

      # Drain request headers before sending a response.
      while ($true) {
        $headerLine = $reader.ReadLine()
        if ([string]::IsNullOrEmpty($headerLine)) { break }
      }

      if ($requestLine -notmatch '^([A-Z]+) (\S+) HTTP/1\.[01]$') {
        Send-Response $stream 400 'text/plain; charset=utf-8' ([byte[]][char[]]'Bad Request')
        continue
      }

      $method = $matches[1]
      $target = $matches[2]
      $headOnly = ($method -eq 'HEAD')
      if ($method -ne 'GET' -and -not $headOnly) {
        Send-Response $stream 405 'text/plain; charset=utf-8' ([byte[]][char[]]'Method Not Allowed')
        continue
      }

      $urlPath = [System.Uri]::UnescapeDataString(($target -split '\?', 2)[0])
      if (-not $urlPath.StartsWith('/')) {
        Send-Response $stream 400 'text/plain; charset=utf-8' ([byte[]][char[]]'Bad Request') $headOnly
        continue
      }

      $relativePath = $urlPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar.ToString())
      $candidate = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($rootPath, $relativePath))

      # Block traversals into files outside the extracted static export.
      if ($candidate -ne $rootPath -and
          -not $candidate.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        Send-Response $stream 403 'text/plain; charset=utf-8' ([byte[]][char[]]'Forbidden') $headOnly
        continue
      }

      if ([System.IO.Directory]::Exists($candidate)) {
        $candidate = [System.IO.Path]::Combine($candidate, 'index.html')
      }

      $status = 200
      if (-not [System.IO.File]::Exists($candidate)) {
        $status = 404
        $candidate = [System.IO.Path]::Combine($rootPath, '404.html')
      }

      if ([System.IO.File]::Exists($candidate)) {
        $contentType = Get-ContentType $candidate
        $body = [System.IO.File]::ReadAllBytes($candidate)
      } else {
        $contentType = 'text/plain; charset=utf-8'
        $body = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
      }

      Send-Response $stream $status $contentType $body $headOnly
    }
    catch {
      # Browsers may open and close preconnect sockets without a request.
      Write-Verbose $_.Exception.Message
    }
    finally {
      if ($null -ne $reader) { $reader.Dispose() }
      $client.Close()
    }
  }
}
finally {
  $listener.Stop()
}
