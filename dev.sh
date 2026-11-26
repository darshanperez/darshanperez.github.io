#!/usr/bin/env bash
# Project-local dev environment: npm/npx caches, global installs and tool
# caches all live in .dev/ inside the repo instead of $HOME or /usr.
#
#   ./dev.sh             open a subshell with the environment
#   source ./dev.sh      load it into the current shell
#   ./dev.sh <cmd...>    run a single command inside it

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
DEV="$ROOT/.dev"
mkdir -p "$DEV/npm-cache" "$DEV/npm-global/bin" "$DEV/cache"

export PORTFOLIO_DEV=1
export NPM_CONFIG_CACHE="$DEV/npm-cache"
export NPM_CONFIG_PREFIX="$DEV/npm-global"
export NPM_CONFIG_UPDATE_NOTIFIER=false
export XDG_CACHE_HOME="$DEV/cache"
export PLAYWRIGHT_BROWSERS_PATH="$DEV/ms-playwright"
export PATH="$ROOT/node_modules/.bin:$DEV/npm-global/bin:$PATH"

# Sourced: stop here and keep the current shell.
(return 0 2>/dev/null) && return 0

if [ $# -gt 0 ]; then
  exec "$@"
fi
echo "portfolio dev shell — installs stay in $DEV (exit to leave)"
exec "${SHELL:-bash}" -i
