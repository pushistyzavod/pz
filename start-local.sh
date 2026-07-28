#!/bin/bash
# Локальный запуск проекта "Пушистый завод" без Docker.
# Требует локальный Node.js и mongod (см. start-mongo.sh).
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
export PATH="$HOME/.local/opt/node-v22.17.1-darwin-arm64/bin:$PATH"

# Подгружаем переменные из .env (server.js читает process.env напрямую)
if [ -f "$ROOT/.env" ]; then
  set -a
  . "$ROOT/.env"
  set +a
fi

# Локально Mongo слушает на 127.0.0.1 (в .env хост "mongo" — это имя сервиса Docker)
export MONGO_URI="mongodb://127.0.0.1:${MONGO_PORT:-27017}/${MONGO_DB:-pushistyzavod}"

# Пути к статике: фронт (Tilda-экспорт) и новый прототип лежат в корне репозитория
export STATIC_DIR="$ROOT/public"
export PROTOTYPE_DIR="$ROOT/prototype"
export PORT="${PORT:-3000}"
export NODE_ENV="${NODE_ENV:-development}"

echo "▶ Node: $(node -v)"
echo "▶ Mongo URI: $MONGO_URI"
echo "▶ Открой в браузере: http://localhost:$PORT"

cd "$ROOT/backend"
exec node server.js
