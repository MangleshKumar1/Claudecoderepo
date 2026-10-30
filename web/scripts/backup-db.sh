#!/usr/bin/env bash
# Back up the YORVIA database to files you control.
#
#   DATABASE_URL='postgresql://...' ./scripts/backup-db.sh [output-folder]
#
# Supabase: Project Settings -> Database -> Connection string -> URI (use your database password).
# Needs the PostgreSQL client tools (pg_dump).
#
# It saves the app's tables and their data (everything in the "public" schema).
# Add INCLUDE_ACCOUNTS=1 to also save the login accounts (emails and password hashes) in a second file.
# That file is sensitive: keep it private and encrypted. You only need it to move to a different server.
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL first (see the comment at the top of this script)}"
command -v pg_dump >/dev/null || { echo "pg_dump not found. Install the PostgreSQL client tools."; exit 1; }

out="${1:-backups}"
mkdir -p "$out"
stamp="$(date +%Y%m%d-%H%M%S)"
file="$out/yorvia-$stamp.dump"

pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --schema=public --file="$file"
echo "Saved $file ($(du -h "$file" | cut -f1))"

if [ "${INCLUDE_ACCOUNTS:-0}" = "1" ]; then
  acc="$out/yorvia-$stamp-accounts.dump"
  pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --data-only --table=auth.users --table=auth.identities --file="$acc" 2>/dev/null \
    || pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --data-only --table=auth.users --file="$acc"
  chmod 600 "$acc"
  echo "Saved $acc ($(du -h "$acc" | cut -f1)). SENSITIVE: contains emails and password hashes."
fi
echo "Reminder: backups contain your users' data. Store them somewhere private."
