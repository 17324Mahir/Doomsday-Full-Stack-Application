#!/bin/sh
set -eu
umask 077

if [ "${1:-}" = managed ]; then
    : "${DATABASE_URL:?Set the private PostgreSQL migration URL}"
    : "${APP_DB_PASSWORD:?Set the application role password}"
    set -- --dbname="$DATABASE_URL"
else
    password_file=/run/planner/db-password
    if [ ! -s "$password_file" ]; then
        openssl rand -hex 32 > "$password_file.new"
        mv "$password_file.new" "$password_file"
    fi
    APP_DB_PASSWORD="$(cat "$password_file")"
    set -- --host=/var/run/postgresql --username=planner --dbname=doomsday_ready --set=socket_admin=1
fi

npm run db:migrate
npm run db:seed
export APP_DB_PASSWORD
exec psql -X --quiet --no-password --set=ON_ERROR_STOP=on "$@" --file=database-access.sql
