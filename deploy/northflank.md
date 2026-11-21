# Host Doomsday Ready on Northflank

Use a Sandbox project with capacity for two always-on services, one manual job and one PostgreSQL database. Use the smallest Sandbox sizes and keep one instance of each service. [Northflank pricing](https://northflank.com/pricing)

All three Docker targets build from the repository root. Keep the database, migration job and API private. Store credentials in Northflank runtime secrets.

| Resource | Docker target | Settings |
| --- | --- | --- |
| Migration job | `managed-setup` | Set `DATABASE_URL` to the database administrator’s private PostgreSQL URI and `APP_DB_PASSWORD` to a generated password. Run once before starting the API and again when deploying migrations. |
| API | `managed-api` | Expose HTTP port 3000 inside the project. Set `DATABASE_URL` to the private URI for the same database, using the role `planner_app` and its generated password. |
| Website | `hosted-web` | Publish HTTP port 8080 with Northflank’s HTTPS endpoint. Set `API_UPSTREAM` to the API’s private host and port, `SITE_HOSTNAME` to the public hostname, and `CADDY_PASSWORD_HASH` to the editor’s bcrypt hash. The editor username defaults to `editor`. |

Use the provider’s database name and TLS connection settings in both PostgreSQL URIs. A hex password from `openssl rand -hex 32` can be used directly in the runtime URI. Keep the same application password across migration runs. The job creates missing tables, seeds empty catalogs and grants the application role limited access. If rotating the database password, update the job and API secrets together. Generate the separate editor hash with the interactive command `docker run --rm -it caddy:2-alpine caddy hash-password`.

Open the public HTTPS URL to browse. Open `/editor` to sign in before changing the catalog. A GET request to `/api/health` returns HTTP 200 with `{"status":"ok"}` when PostgreSQL responds, or HTTP 503 if the API loses its database connection.

Set the GitHub Actions repository variable `PUBLIC_SITE_URL` to the public HTTPS origin and run **Check live site** once. GitHub then schedules a check every 15 minutes. Runs can be delayed, and GitHub disables scheduled workflows in public repositories after 60 days without repository activity. The hosting plan keeps the services running independently of the monitor. [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
