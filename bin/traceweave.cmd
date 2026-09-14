@echo off
setlocal
set "ROOT=%~dp0.."
set "NODE_PATH=%ROOT%\src\node_modules;%NODE_PATH%"

if not exist "%ROOT%\src\node_modules\tsx\dist\cli.mjs" (
  where npm >nul 2>nul
  if errorlevel 1 (
    echo {"ok":false,"error":"npm not found. Install Node.js v20+ first."} 1>&2
    exit /b 1
  )
  echo.
  echo 📦 Installing TraceWeave dependencies (first run)...
  if exist "%ROOT%\src\package-lock.json" (
    call npm ci --prefix "%ROOT%\src"
  ) else (
    call npm install --prefix "%ROOT%\src"
  )
)

if "%~1"=="serve" if exist "%ROOT%\src\dist\cli\index.js" (
  echo.
  echo ⚙ Building CLI before serve...
  call npm run build:cli --prefix "%ROOT%\src"
)

if exist "%ROOT%\src\dist\cli\index.js" (
  node "%ROOT%\src\dist\cli\index.js" %*
) else (
  node "%ROOT%\src\node_modules\tsx\dist\cli.mjs" "%ROOT%\src\cli\index.ts" %*
)
