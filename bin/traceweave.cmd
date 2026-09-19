@echo off
setlocal
set "ROOT=%~dp0.."
set "NODE_PATH=%ROOT%\src\node_modules;%NODE_PATH%"

if "%~1"=="serve" goto :build_cli
if "%~1"=="test" goto :build_cli
if exist "%ROOT%\src\dist\cli\index.js" goto :run_cli
goto :run_tsx

:build_cli
if exist "%ROOT%\src\dist\cli\index.js" (
  echo.
  echo ⚙ Building CLI...
  call npm run build:cli --prefix "%ROOT%\src"
)
goto :run_cli

:run_cli

node "%ROOT%\src\dist\cli\index.js" %*
goto :eof

:run_tsx
node "%ROOT%\src\node_modules\tsx\dist\cli.mjs" "%ROOT%\src\cli\index.ts" %*
