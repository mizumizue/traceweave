$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path "$ScriptDir\.."

$env:NODE_PATH = "$Root\src\node_modules" + [System.IO.Path]::PathSeparator + $env:NODE_PATH

function Install-TraceWeaveDependencies {
  if (Test-Path "$Root\src\node_modules\tsx\dist\cli.mjs") {
    return
  }
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error '{"ok":false,"error":"npm not found. Install Node.js v20+ first."}'
    exit 1
  }
  Write-Host ""
  Write-Host "📦 Installing TraceWeave dependencies (first run)..."
  if (Test-Path "$Root\src\package-lock.json") {
    npm ci --prefix "$Root\src"
  } else {
    npm install --prefix "$Root\src"
  }
}

Install-TraceWeaveDependencies

if ($args.Count -gt 0 -and $args[0] -eq "serve" -and (Test-Path "$Root\src\dist\cli\index.js")) {
  Write-Host ""
  Write-Host "⚙ Building CLI before serve..."
  npm run build:cli --prefix "$Root\src"
}

if (Test-Path "$Root\src\dist\cli\index.js") {
  & node "$Root\src\dist\cli\index.js" @args
} else {
  & node "$Root\src\node_modules\tsx\dist\cli.mjs" "$Root\src\cli\index.ts" @args
}
