#!/bin/sh
# Every check the studio has, in one go. Run it before each deploy:
#
#   sh tests/run.sh
#
# The browser checks drive the real app, so they catch a change that undoes an earlier fix —
# which is how the brand screens, smooth playback and 9:16 framing each broke once already.
set -e
cd "$(dirname "$0")/.."

DEPS=tests/.deps
if [ ! -d "$DEPS/node_modules/playwright-core" ]; then
  echo "installing the browser driver for the checks..."
  npm i --silent --no-save --prefix "$DEPS" playwright-core
fi

echo "== types"
npx tsc --noEmit

echo "== timing"
npx tsx tests/timing.test.ts

echo "== studio in a browser"
if curl -sf -o /dev/null http://localhost:3000/api/health; then
  echo "something is already running on port 3000 — stop it first"
  exit 1
fi
NODE_ENV=development npx tsx server.ts > "$DEPS/server.log" 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
for i in $(seq 1 60); do
  curl -sf -o /dev/null http://localhost:3000/api/health && break
  sleep 1
done
node tests/studio.ui.mjs
