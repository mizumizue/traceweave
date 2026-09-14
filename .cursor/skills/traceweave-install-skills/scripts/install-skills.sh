#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
NODE_PATH="$ROOT/src/node_modules${NODE_PATH:+:$NODE_PATH}"
export NODE_PATH
exec "$ROOT/src/node_modules/.bin/tsx" "$ROOT/scripts/install-cursor-skills.ts" "$@"
