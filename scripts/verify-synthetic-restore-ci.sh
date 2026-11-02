#!/bin/sh
set -eu

: "${PG_CONTAINER_ID:?GitHub Actions PostgreSQL container is required}"

source_database=arena_goal
restore_database=arena_restore_ci
archive=/tmp/arena-goal-ci.dump

docker exec "$PG_CONTAINER_ID" pg_dump -U postgres -d "$source_database" --format=custom --no-owner --file="$archive"
docker exec "$PG_CONTAINER_ID" createdb -U postgres "$restore_database"
docker exec "$PG_CONTAINER_ID" pg_restore -U postgres -d "$restore_database" --no-owner --exit-on-error "$archive"

signature_sql="SELECT (SELECT count(*) FROM \"Arena\")::text || ':' || (SELECT count(*) FROM \"Player\")::text || ':' || (SELECT count(*) FROM \"FinancialEntry\")::text || ':' || (SELECT count(*) FROM pg_policies WHERE schemaname = 'public')::text || ':' || (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relrowsecurity)::text"
source_signature="$(docker exec "$PG_CONTAINER_ID" psql -U postgres -d "$source_database" -X -At -v ON_ERROR_STOP=1 -c "$signature_sql")"
restore_signature="$(docker exec "$PG_CONTAINER_ID" psql -U postgres -d "$restore_database" -X -At -v ON_ERROR_STOP=1 -c "$signature_sql")"

if [ "$source_signature" != "$restore_signature" ]; then
  echo 'Synthetic restore changed core row counts or arena isolation policies.' >&2
  exit 1
fi

policy_count="$(docker exec "$PG_CONTAINER_ID" psql -U postgres -d "$restore_database" -X -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM pg_policies WHERE schemaname = 'public'")"
if [ "$policy_count" -eq 0 ]; then
  echo 'Synthetic restore has no arena isolation policies.' >&2
  exit 1
fi

docker exec "$PG_CONTAINER_ID" psql -U postgres -d "$restore_database" -X -At -v ON_ERROR_STOP=1 \
  -c 'SET ROLE arena_runtime; SELECT count(*) FROM "Arena";' >/dev/null

migration_access="$(docker exec "$PG_CONTAINER_ID" psql -U postgres -d "$restore_database" -X -At -v ON_ERROR_STOP=1 -c "SELECT has_table_privilege('arena_runtime', '\"_prisma_migrations\"', 'SELECT')")"
if [ "$migration_access" != 'f' ]; then
  echo 'Restored runtime role can read the migration ledger.' >&2
  exit 1
fi

# ACLs are part of recovery, not a generic set of replacement grants.
security_signature="SELECT (SELECT has_table_privilege('arena_runtime', '\"AuditEvent\"', 'UPDATE'))::text || ':' || (SELECT has_table_privilege('arena_runtime', '\"AuditEvent\"', 'DELETE'))::text || ':' || (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.prosecdef AND EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'))::text"
source_security="$(docker exec "$PG_CONTAINER_ID" psql -U postgres -d "$source_database" -X -At -v ON_ERROR_STOP=1 -c "$security_signature")"
restore_security="$(docker exec "$PG_CONTAINER_ID" psql -U postgres -d "$restore_database" -X -At -v ON_ERROR_STOP=1 -c "$security_signature")"
if [ "$source_security" != "$restore_security" ]; then
  echo 'Synthetic restore changed audit or function privileges.' >&2
  exit 1
fi

echo 'Synthetic PostgreSQL 18 backup restored with matching core counts and isolation policies.'
