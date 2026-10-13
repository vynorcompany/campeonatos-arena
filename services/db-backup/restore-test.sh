#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"
: "${RESTORE_CONFIRM:?Set RESTORE_CONFIRM=RESTORE_DISPOSABLE_DATABASE to continue}"
: "${S3_BUCKET:?S3_BUCKET is required}"
: "${S3_ENDPOINT:?S3_ENDPOINT is required}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"
: "${AWS_DEFAULT_REGION:?AWS_DEFAULT_REGION is required}"

if [ "$RESTORE_DATABASE_URL" = "$DATABASE_URL" ]; then
  echo "RESTORE_DATABASE_URL must not match DATABASE_URL" >&2
  exit 1
fi

if [ "$RESTORE_CONFIRM" != "RESTORE_DISPOSABLE_DATABASE" ]; then
  echo "Set RESTORE_CONFIRM=RESTORE_DISPOSABLE_DATABASE to confirm the isolated target." >&2
  exit 1
fi

# Compare actual cluster/database identities, rather than URL strings (aliases and
# query parameters can point to the same database). Never erase existing tables.
source_identity="$(psql "$DATABASE_URL" -X -At -v ON_ERROR_STOP=1 -c "SELECT system_identifier::text || ':' || current_database() FROM pg_control_system()")"
target_identity="$(psql "$RESTORE_DATABASE_URL" -X -At -v ON_ERROR_STOP=1 -c "SELECT system_identifier::text || ':' || current_database() FROM pg_control_system()")"
if [ "$source_identity" = "$target_identity" ]; then
  echo "Restore target resolves to the production database." >&2
  exit 1
fi
target_name="$(psql "$RESTORE_DATABASE_URL" -X -At -v ON_ERROR_STOP=1 -c 'SELECT current_database()')"
case "$target_name" in arena_restore_*) ;; *) echo "Restore database name must start with arena_restore_." >&2; exit 1 ;; esac
target_tables="$(psql "$RESTORE_DATABASE_URL" -X -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname NOT IN ('pg_catalog', 'information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND c.relkind IN ('r', 'p')")"
if [ "$target_tables" != "0" ]; then
  echo "Restore target must be empty; existing tables will not be erased." >&2
  exit 1
fi
target_runtime_role="$(psql "$RESTORE_DATABASE_URL" -X -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM pg_roles WHERE rolname = 'arena_runtime' AND rolcanlogin AND NOT rolsuper AND NOT rolbypassrls")"
if [ "$target_runtime_role" != "1" ]; then
  echo "Restore target needs an arena_runtime LOGIN role before the drill." >&2
  exit 1
fi

prefix="${BACKUP_PREFIX:-arena-padel}"
latest_key="$(aws s3 ls "s3://${S3_BUCKET}/${prefix}/" --recursive --endpoint-url "$S3_ENDPOINT" | awk '{print $4}' | sort | tail -n 1)"

if [ -z "$latest_key" ]; then
  echo "No backup found under ${prefix}/" >&2
  exit 1
fi

file="/tmp/restore-test.dump"
cleanup() {
  rm -f "$file"
}
trap cleanup EXIT INT TERM

echo "Downloading backup ${latest_key}"
aws s3 cp "s3://${S3_BUCKET}/${latest_key}" "$file" --endpoint-url "$S3_ENDPOINT" --only-show-errors

echo "Restoring into the confirmed disposable database"
pg_restore --dbname="$RESTORE_DATABASE_URL" --no-owner --no-privileges --exit-on-error "$file"
psql "$RESTORE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "${RESTORE_PRIVILEGES_SQL:-/restore-runtime-privileges.sql}" >/dev/null
security_sql="SELECT (SELECT count(*) FROM pg_policies WHERE schemaname = 'public')::text || ':' || (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relrowsecurity)::text"
source_security="$(psql "$DATABASE_URL" -X -At -v ON_ERROR_STOP=1 -c "$security_sql")"
target_security="$(psql "$RESTORE_DATABASE_URL" -X -At -v ON_ERROR_STOP=1 -c "$security_sql")"
if [ "$target_security" = "0:0" ] || [ "$target_security" != "$source_security" ]; then
  echo "Restore did not preserve the current arena isolation policies." >&2
  exit 1
fi
privilege_sql="SELECT md5(string_agg(c.relname || ':' || has_table_privilege('arena_runtime', c.oid, 'SELECT')::text || has_table_privilege('arena_runtime', c.oid, 'INSERT')::text || has_table_privilege('arena_runtime', c.oid, 'UPDATE')::text || has_table_privilege('arena_runtime', c.oid, 'DELETE')::text || has_table_privilege('arena_runtime', c.oid, 'TRUNCATE')::text, '|' ORDER BY c.relname)) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')"
source_privileges="$(psql "$DATABASE_URL" -X -At -v ON_ERROR_STOP=1 -c "$privilege_sql")"
target_privileges="$(psql "$RESTORE_DATABASE_URL" -X -At -v ON_ERROR_STOP=1 -c "$privilege_sql")"
if [ "$source_privileges" != "$target_privileges" ]; then
  echo "Restore did not preserve the application's table privileges." >&2
  exit 1
fi
sequence_sql="SELECT md5(coalesce(string_agg(c.relname || ':' || has_sequence_privilege('arena_runtime', c.oid, 'USAGE')::text || has_sequence_privilege('arena_runtime', c.oid, 'SELECT')::text || has_sequence_privilege('arena_runtime', c.oid, 'UPDATE')::text, '|' ORDER BY c.relname), '')) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'S'"
source_sequences="$(psql "$DATABASE_URL" -X -At -v ON_ERROR_STOP=1 -c "$sequence_sql")"
target_sequences="$(psql "$RESTORE_DATABASE_URL" -X -At -v ON_ERROR_STOP=1 -c "$sequence_sql")"
if [ "$source_sequences" != "$target_sequences" ]; then
  echo "Restore did not preserve the application's sequence privileges." >&2
  exit 1
fi
psql "$RESTORE_DATABASE_URL" -X -At -v ON_ERROR_STOP=1 -c 'SET ROLE arena_runtime; SELECT count(*) FROM "Arena";' >/dev/null
psql "$RESTORE_DATABASE_URL" -X -At -v ON_ERROR_STOP=1 -c 'SET ROLE arena_runtime; DO $$BEGIN IF EXISTS (SELECT 1 FROM "ScheduleOccurrence") THEN RAISE EXCEPTION '\''Unscoped arena rows are visible after restore'\''; END IF; END$$;' >/dev/null
psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -c 'SELECT current_database() AS restored_database, NOW() AS checked_at;'
psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -c '
SELECT
  (SELECT count(*) FROM "FinancialEntry") AS financial_entries,
  (SELECT count(*) FROM "FinancialSettlement") AS financial_settlements,
  (SELECT count(*) FROM "Comanda") AS comandas,
  (SELECT count(*) FROM "ScheduleOccurrence") AS schedule_occurrences,
  (SELECT count(*) FROM "Tournament") AS tournaments;
'
echo "Restore validation completed successfully."
