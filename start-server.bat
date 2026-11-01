@echo off
setlocal
set "APP_DIR=%~dp0"

if not exist "%APP_DIR%dist\index.html" (
  echo [ERROR] Offline site files are missing: dist\index.html
  echo.
  echo Download and extract the react-gui-tool offline ZIP from GitHub Actions.
  echo For a source checkout, run "pnpm install" and "pnpm build" once while online.
  pause
  exit /b 1
)

if not exist "%APP_DIR%scripts\serve-dist.ps1" (
  echo [ERROR] scripts\serve-dist.ps1 was not found.
  pause
  exit /b 1
)

where powershell.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Windows PowerShell is required.
  pause
  exit /b 1
)

echo Starting React GUI Tool in your default browser...
echo Press Ctrl+C in this window to stop the local server.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%APP_DIR%scripts\serve-dist.ps1" -Root "%APP_DIR%dist"
if errorlevel 1 (
  echo.
  echo [ERROR] The local server could not start.
  pause
)
exit /b %errorlevel%
