$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path "$ScriptDir\.."

$env:NODE_PATH = "$Root\src\node_modules" + [System.IO.Path]::PathSeparator + $env:NODE_PATH

$cliSrc = "$Root\src\cli\index.ts"
$cliDist = "$Root\src\dist\cli\index.js"
if (Test-Path $cliDist) {
  $rebuild = $args.Count -gt 0 -and ($args[0] -eq "serve" -or $args[0] -eq "test")
  if (-not $rebuild -and (Test-Path $cliSrc)) {
    $rebuild = (Get-Item $cliSrc).LastWriteTimeUtc -gt (Get-Item $cliDist).LastWriteTimeUtc
  }
  if ($rebuild) {
    Write-Host ""
    Write-Host "⚙ Building CLI..."
    npm run build:cli --prefix "$Root\src"
  }
}

if (Test-Path "$Root\src\dist\cli\index.js") {
  & node "$Root\src\dist\cli\index.js" @args
} else {
  & node "$Root\src\node_modules\tsx\dist\cli.mjs" "$Root\src\cli\index.ts" @args
}
