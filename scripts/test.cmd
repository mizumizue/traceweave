@echo off
setlocal
set "ROOT=%~dp0.."
set "NODE_PATH=%ROOT%\src\node_modules;%NODE_PATH%"

echo Building web dashboard...
call npm --prefix "%ROOT%\src" run build:web
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running test suite...
node "%ROOT%\src\node_modules\tsx\dist\cli.mjs" --test "%ROOT%\tests\**\*.test.ts"
