#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

export NODE_PATH="$ROOT/src/node_modules${NODE_PATH:+:$NODE_PATH}"

echo "Building web dashboard..."
npm --prefix "$ROOT/src" run build:web

echo "Running test suite with report generation..."
"$ROOT/src/node_modules/.bin/tsx" "$ROOT/scripts/run-test-suite.ts"
