@echo off
setlocal
set "ROOT=%~dp0.."
set "NODE_PATH=%ROOT%\src\node_modules;%NODE_PATH%"

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
