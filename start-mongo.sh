#!/bin/bash
# Запуск локальной MongoDB (установлена в ~/.local/opt/mongodb-macos-aarch64-8.0.4)
set -e

MONGO_BIN="$HOME/.local/opt/mongodb-macos-aarch64-8.0.4/bin/mongod"
DBPATH="$HOME/.local/var/mongodb"
LOGPATH="$HOME/.local/var/log/mongod.log"

mkdir -p "$DBPATH" "$(dirname "$LOGPATH")"

if pgrep -f "mongodb-macos.*mongod" > /dev/null; then
  echo "✅ mongod уже запущен (pid $(pgrep -f 'mongodb-macos.*mongod' | tr '\n' ' '))"
  exit 0
fi

"$MONGO_BIN" --dbpath "$DBPATH" --logpath "$LOGPATH" --port 27017 --bind_ip 127.0.0.1 --fork
echo "✅ mongod запущен на 127.0.0.1:27017 (лог: $LOGPATH)"
