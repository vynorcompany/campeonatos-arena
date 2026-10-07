#!/bin/sh
set -eu

# Restore the stored dump into a fresh cluster inside this backup container.
# No connection to the application database is used for writes.
cluster="$(mktemp -d /tmp/arena-restore-drill.XXXXXX)"
chown postgres:postgres "$cluster"
started=0
cleanup() {
  if [ "$started" = "1" ]; then
    su -s /bin/sh postgres -c "pg_ctl -D '$cluster' -m fast -w stop" >/dev/null
  fi
}
trap cleanup EXIT INT TERM

su -s /bin/sh postgres -c "initdb -D '$cluster' --auth-local=trust --auth-host=trust" >/dev/null
su -s /bin/sh postgres -c "pg_ctl -D '$cluster' -l '$cluster/server.log' -o '-h 127.0.0.1 -p 55432 -k $cluster' -w start" >/dev/null
started=1
createdb -h 127.0.0.1 -p 55432 -U postgres arena_restore_drill
export RESTORE_DATABASE_URL="postgresql://postgres@127.0.0.1:55432/arena_restore_drill"
export RESTORE_CONFIRM="RESTORE_DISPOSABLE_DATABASE"
sh /restore-test.sh
echo "Isolated backup restore drill passed. Production was not modified."
