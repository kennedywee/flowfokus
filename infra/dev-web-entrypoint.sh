#!/usr/bin/env sh
set -eu
case "${HYDRAFLOW_WEB_APP:-portal}" in
  portal|site) app="${HYDRAFLOW_WEB_APP:-portal}" ;;
  *) echo "HYDRAFLOW_WEB_APP must be portal or site" >&2; exit 1 ;;
esac
# Local Worker bindings. This file is created at runtime, never in a release build.
umask 077
printf 'API_BASE_URL=%s\nHYDRAFLOW_DEMO_MODE=%s\nHYDRAFLOW_DEMO_TOKEN=%s\n' \
  "${API_BASE_URL:-http://server:3000}" \
  "${HYDRAFLOW_DEMO_MODE:-false}" \
  "${HYDRAFLOW_DEMO_TOKEN:-}" > "/app/apps/$app/.dev.vars"
exec "$@"
