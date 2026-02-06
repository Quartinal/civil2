#!/bin/bash
set -e

if [ ! -d "node_modules" ]; then
  pnpm install
fi

pnpm build

cd misc/protectors
uv sync
uv run python internal/server &
PY_PID=$!

cd ../..
pnpm start &
NODE_PID=$!

trap "kill $PY_PID $NODE_PID" EXIT

wait $PY_PID $NODE_PID