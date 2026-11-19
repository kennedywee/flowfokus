# Sourced by launch and cleanup. Tracks which containers this run created.
#
# The marker holds the launch mode (fresh or kept) on its first line, then one
# "<container name> <container id>" line for each service. Container IDs change
# whenever a container is recreated, so a stack that someone else started
# later, even from another checkout, never matches the marker.

MARKER="$REPO/.artifacts/verify-flowfokus/started-by-run"
SERVICES=(db workos server jobs portal site)

current_ids() {
  local name
  for name in "${SERVICES[@]}"; do
    printf 'flowfokus-%s %s\n' "$name" "$(docker inspect -f '{{.Id}}' "flowfokus-$name" 2>/dev/null || echo missing)"
  done
}

# Writes the mode and the IDs of the containers that exist now.
record_ownership() {
  mkdir -p "$(dirname "$MARKER")"
  { echo "$1"; current_ids; } > "$MARKER"
}

marker_mode() { head -n 1 "$MARKER"; }

# True when the marker exists and every recorded container is still the same one.
owns_stack() {
  [[ -f $MARKER ]] || return 1
  [[ $(tail -n +2 "$MARKER") == "$(current_ids)" ]]
}
