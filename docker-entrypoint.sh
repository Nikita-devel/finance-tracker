#!/bin/sh
# Migrations avant tout démarrage. Idempotent : `migrate deploy` ne rejoue pas
# une migration déjà appliquée.
set -e

DB_PATH="${DATABASE_URL#file:}"
DB_DIR="$(dirname "$DB_PATH")"

if [ ! -w "$DB_DIR" ]; then
  echo "FATAL: $DB_DIR n'est pas accessible en écriture par l'utilisateur $(id -u):$(id -g)." >&2
  echo "       Sur l'hôte : chown -R 1000:1000 <dossier monté sur /data>" >&2
  exit 1
fi

echo "[entrypoint] prisma migrate deploy -> $DB_PATH"
node_modules/.bin/prisma migrate deploy

if [ "${FT_SEED:-0}" = "1" ]; then
  echo "[entrypoint] seed (FT_SEED=1)"
  node_modules/.bin/prisma db seed
fi

exec "$@"
