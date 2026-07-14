#!/bin/zsh
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  npm install
fi
open "http://127.0.0.1:5173"
npm run dev
