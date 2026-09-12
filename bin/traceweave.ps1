$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path "$ScriptDir\.."

$env:NODE_PATH = "$Root\src\node_modules" + [System.IO.Path]::PathSeparator + $env:NODE_PATH

if (-not (Test-Path "$Root\src\node_modules")) {
  Write-Error '{"ok":false,"error":"Dependencies not found. Please run ''npm --prefix src install'' first."}'
  exit 1
}

if (Test-Path "$Root\src\dist\cli\index.js") {
  & node "$Root\src\dist\cli\index.js" @args
} else {
  & node "$Root\src\node_modules\tsx\dist\cli.mjs" "$Root\src\cli\index.ts" @args
}
