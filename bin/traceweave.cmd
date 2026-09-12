@echo off
setlocal
set "ROOT=%~dp0.."
set "NODE_PATH=%ROOT%\src\node_modules;%NODE_PATH%"

if not exist "%ROOT%\src\node_modules" (
  echo {"ok":false,"error":"Dependencies not found. Please run 'npm --prefix src install' first."} 1>&2
  exit /b 1
)

if exist "%ROOT%\src\dist\cli\index.js" (
  node "%ROOT%\src\dist\cli\index.js" %*
) else (
  node "%ROOT%\src\node_modules\tsx\dist\cli.mjs" "%ROOT%\src\cli\index.ts" %*
)
