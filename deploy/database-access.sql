\getenv app_password APP_DB_PASSWORD
BEGIN;
SELECT 'CREATE ROLE planner_app LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'planner_app') \gexec
ALTER ROLE planner_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'app_password';
ALTER ROLE planner PASSWORD NULL;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE doomsday_ready TO planner_app;
GRANT USAGE ON SCHEMA public TO planner_app;
GRANT SELECT, INSERT ON movies, cinemas, cinema_bundles TO planner_app;
GRANT UPDATE ("watched", "updatedAt") ON movies TO planner_app;
GRANT SELECT, INSERT, DELETE ON movie_prerequisites TO planner_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO planner_app;
COMMIT;
