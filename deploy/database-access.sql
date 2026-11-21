\set ON_ERROR_STOP on
BEGIN;
\if :{?runtime_role}
SET LOCAL doomsday.runtime_role = :'runtime_role';
DO $$
DECLARE
  app_role name := current_setting('doomsday.runtime_role');
BEGIN
  IF app_role = current_user
     OR has_schema_privilege(app_role, 'public', 'CREATE')
     OR has_column_privilege(app_role, 'public.movies', 'title', 'UPDATE')
     OR has_column_privilege(app_role, 'public.movies', 'runtime', 'UPDATE')
     OR has_column_privilege(app_role, 'public.movies', 'releaseYear', 'UPDATE')
     OR has_table_privilege(app_role, 'public.movies', 'DELETE,TRUNCATE') THEN
    RAISE EXCEPTION 'Choose a separate read-only database role for the application';
  END IF;
END
$$;
REVOKE ALL ON TABLE public."_prisma_migrations" FROM :"runtime_role";
\else
\set runtime_role planner_app
\getenv app_password APP_DB_PASSWORD
SELECT 'CREATE ROLE planner_app LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'planner_app') \gexec
ALTER ROLE planner_app PASSWORD :'app_password';
\if :{?socket_admin}
ALTER ROLE planner_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
ALTER ROLE planner PASSWORD NULL;
\endif
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE :"DBNAME" TO planner_app;
GRANT USAGE ON SCHEMA public TO planner_app;
\endif
GRANT SELECT, INSERT ON public.movies, public.cinemas, public.cinema_bundles TO :"runtime_role";
GRANT UPDATE ("watched", "updatedAt") ON public.movies TO :"runtime_role";
GRANT SELECT, INSERT, DELETE ON public.movie_prerequisites TO :"runtime_role";
GRANT USAGE ON SEQUENCE public.movies_id_seq, public.cinemas_id_seq, public.cinema_bundles_id_seq TO :"runtime_role";
COMMIT;
