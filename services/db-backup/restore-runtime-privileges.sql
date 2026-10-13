-- pg_restore --no-privileges intentionally skips source-cluster ACLs. Rebuild
-- the application's least-privilege grants in the disposable restore target.
GRANT USAGE ON SCHEMA public TO arena_runtime;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM arena_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO arena_runtime;
REVOKE ALL PRIVILEGES ON TABLE "_prisma_migrations" FROM arena_runtime;
REVOKE DELETE ON TABLE "ArenaServicePrice" FROM arena_runtime;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM arena_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO arena_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM arena_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO arena_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM arena_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO arena_runtime;
