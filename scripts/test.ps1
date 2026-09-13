$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path "$ScriptDir\.."

$env:NODE_PATH = "$Root\src\node_modules" + [System.IO.Path]::PathSeparator + $env:NODE_PATH

Write-Host "Building web dashboard..."
npm --prefix "$Root\src" run build:web

Write-Host "Running test suite with report generation..."
& node "$Root\src\node_modules\tsx\dist\cli.mjs" "$Root\scripts\run-test-suite.ts"
