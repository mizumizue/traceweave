$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")
$env:NODE_PATH = Join-Path $Root "src\node_modules"
$Tsx = Join-Path $Root "src\node_modules\.bin\tsx.cmd"
$Script = Join-Path $Root "scripts\install-cursor-skills.ts"
& $Tsx $Script @args
