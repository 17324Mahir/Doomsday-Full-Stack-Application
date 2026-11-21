# Deploy on alwaysdata Free

The Free plan supports personal sites with 1 GB of disk, 256 MB of RAM, a hosted PostgreSQL database and an HTTPS address at `ACCOUNT.alwaysdata.net`. Signup is card-free. Replace `ACCOUNT` below with the hosting account name. [Free plan](https://www.alwaysdata.com/en/offers/)

## Prepare the catalog

In **Databases → PostgreSQL**, create a database for this app and two dedicated users. Give the migration user **Full permissions** on this database and the runtime user **Read only**. Account-created names start with `ACCOUNT_`. The migration user must own the tables it creates. [PostgreSQL connection and permissions](https://help.alwaysdata.com/en/docs/web-hosting/databases/postgresql/)

On a trusted workstation with Node.js 24 and the PostgreSQL client, set `DATABASE_URL` to the migration user’s URI with TLS enabled. Set `PGHOST`, `PGDATABASE` and `PGUSER` to the same server, database and migration user, and set `RUNTIME_ROLE` to the runtime username. Keep passwords in your password manager and load the URI privately into the shell. Run these commands from the repository root.

```sh
(
  cd backend &&
  npm ci &&
  npm run db:generate &&
  npm run db:migrate &&
  npm run db:seed
) &&
PGSSLMODE=require psql -X --password --host="$PGHOST" --dbname="$PGDATABASE" \
  --username="$PGUSER" --set=runtime_role="$RUNTIME_ROLE" \
  --file=deploy/database-access.sql
```

The grants allow the runtime role to insert movies and update watched status while keeping existing titles, release years and runtimes fixed. Reapply the grants after migrations or after saving database permissions in the hosting dashboard. The provider reapplies its standard grants when those permissions are saved.

## Publish the website

Build the Linux bundle on the workstation. Upload it with the account’s SSH access and extract it outside the web root. Verify the SSH host fingerprint against **Remote access → SSH/SFTP** when first connecting. [SSH access](https://help.alwaysdata.com/en/docs/web-hosting/remote-access/ssh/)

```sh
bundle_dir=$(mktemp -d)
docker buildx build --platform linux/amd64 --target alwaysdata \
  --output "type=tar,dest=$bundle_dir/runtime.tar" . &&
ssh "ACCOUNT@ssh-ACCOUNT.alwaysdata.net" \
  'set -eu; umask 077; mkdir -p "$HOME/doomsday/release"; tar -xf - -C "$HOME/doomsday/release"' \
  < "$bundle_dir/runtime.tar"
```

For updates, extract into a fresh release directory and switch the site command after verification. Keep the previous release until the new one passes the health check.

In **Web → Sites**, configure the intended site as **User program**, with command `/bin/bash /home/ACCOUNT/doomsday/release/start.sh`. Use `ACCOUNT.alwaysdata.net` as the address, enable **Force HTTPS**, and set **Advanced → Idle time** to `0`. The platform supplies the listening IP and port. Set these site environment variables. [User program hosting](https://help.alwaysdata.com/en/docs/web-hosting/sites/http-servers/user-program/) · [Idle time](https://help.alwaysdata.com/en/docs/web-hosting/sites/misc/)

| Variable | Value |
| --- | --- |
| `SITE_HOSTNAME` | The public hostname without a scheme or trailing slash |
| `DATABASE_URL` | PostgreSQL URI for the restricted runtime user, including the database name and TLS settings |
| `CADDY_PASSWORD_HASH` | Editor bcrypt hash from `docker run --rm -it caddy:2-alpine caddy hash-password` |
| `EDITOR_USERNAME` | Optional editor username, defaults to `editor` |

Open `https://ACCOUNT.alwaysdata.net/api/health` to start the site and verify the database. The expected response is HTTP 200 and `{"status":"ok"}`. Check the movie library at `/` and sign in at `/editor` for edits. Set the GitHub Actions repository variable `PUBLIC_SITE_URL` to the public HTTPS origin and run **Check live site** for the first external check.

An idle time of zero keeps the website running between requests. After maintenance, the next request starts it again. The free account owner must sign in to the administration dashboard at least every 120 days during the first year. [Account inactivity](https://help.alwaysdata.com/en/docs/admin-billing/profile/suspension/)
