#!/usr/bin/env bash
set -euo pipefail
cd /app/apps/api
bun src/db/migrate.ts
bun src/server.ts &
API_PID=$!
cd /app/apps/web
PORT=3000 ORIGIN=${WEB_ORIGIN:-http://localhost:3000} node build/index.js &
WEB_PID=$!
trap "kill $API_PID $WEB_PID" SIGINT SIGTERM
wait -n $API_PID $WEB_PID
