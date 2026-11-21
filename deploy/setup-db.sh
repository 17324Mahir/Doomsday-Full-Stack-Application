#!/bin/sh
set -eu
umask 077

password_file=/run/planner/db-password
if [ ! -s "$password_file" ]; then
    openssl rand -hex 32 > "$password_file.new"
    mv "$password_file.new" "$password_file"
fi

npm run db:migrate
npm run db:seed
APP_DB_PASSWORD="$(cat "$password_file")" psql -X --quiet --set=ON_ERROR_STOP=on \
    --host=/var/run/postgresql --username=planner --dbname=doomsday_ready --file=database-access.sql
