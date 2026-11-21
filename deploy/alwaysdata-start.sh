#!/bin/bash
set -eu
umask 077

cd -- "$(dirname -- "$0")"
: "${DATABASE_URL:?Set the restricted database URL}"
: "${SITE_HOSTNAME:?Set the public hostname}"
: "${CADDY_PASSWORD_HASH:?Set the editor password hash}"
export GATEWAY_BIND="${IP:-${HOST:?Set the provider listen address}}"
export GATEWAY_PORT="${PORT:?Set the provider listen port}"
export WEB_ROOT="$PWD/public" EDITOR_USERNAME="${EDITOR_USERNAME:-editor}"

socket_dir=$(mktemp -d /tmp/doomsday-ready.XXXXXXXX)
export API_SOCKET="$socket_dir/api.sock"
export API_UPSTREAM="unix/$API_SOCKET"
export NODE_ENV=production NODEJS_VERSION=24 GOMAXPROCS=2
api_pid=
web_pid=

stop() {
    if [[ -n "$web_pid" ]]; then kill "$web_pid" 2>/dev/null || true; fi
    if [[ -n "$api_pid" ]]; then kill "$api_pid" 2>/dev/null || true; fi
    wait || true
    rm -f -- "$API_SOCKET"
    rmdir -- "$socket_dir"
}
trap stop EXIT
trap 'exit 143' TERM HUP
trap 'exit 130' INT

env -u CADDY_PASSWORD_HASH node app/dist/main.js &
api_pid=$!
env -u DATABASE_URL ./bin/caddy run --config config/hosted.Caddyfile --adapter caddyfile &
web_pid=$!
wait -n
