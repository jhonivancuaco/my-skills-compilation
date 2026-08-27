#!/usr/bin/env bash
# start.sh — bring the bus up if it isn't already. Safe to run repeatedly.
# Prints PORT= and STATUS= on success.
set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${BUS_PORT:-7777}"
URL="http://127.0.0.1:$PORT"

probe() { curl -sf --max-time 2 "$URL/health" 2>/dev/null; }

# Already up? Reuse it — a second host must never start a rival bus.
EXISTING="$(probe || true)"
if [ -n "$EXISTING" ]; then
  if echo "$EXISTING" | grep -q pair-coding-bus; then
    echo "PORT=$PORT"
    echo "STATUS=already-running"
    exit 0
  fi
  echo "ERROR: port $PORT is used by another service. Retry with BUS_PORT=7788" >&2
  exit 1
fi

if [ ! -d "$DIR/node_modules" ]; then
  echo "Installing dependencies (one time, ~20s)..." >&2
  (cd "$DIR" && npm install --silent --no-fund --no-audit >&2) || {
    echo "ERROR: npm install failed. Is Node 18+ installed?" >&2
    exit 1
  }
fi

cd "$DIR"
# setsid + </dev/null fully detaches, so the calling session never blocks.
# macOS has no setsid; nohup alone detaches well enough there.
if command -v setsid >/dev/null 2>&1; then
  setsid nohup node server.js --port "$PORT" > "$DIR/bus.log" 2>&1 < /dev/null &
else
  nohup node server.js --port "$PORT" > "$DIR/bus.log" 2>&1 < /dev/null &
fi
echo $! > "$DIR/bus.pid"
disown 2>/dev/null || true

for _ in $(seq 1 40); do
  if probe >/dev/null; then
    echo "PORT=$PORT"
    echo "STATUS=started"
    exit 0
  fi
  sleep 0.3
done

echo "ERROR: bus failed to start. Log:" >&2
cat "$DIR/bus.log" >&2
exit 1
