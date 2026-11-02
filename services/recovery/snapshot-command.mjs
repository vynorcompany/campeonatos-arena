const postgresStatusSql = `BEGIN READ ONLY; SET LOCAL TIME ZONE 'UTC'; SELECT jsonb_build_object('systemIdentifier',(SELECT system_identifier::text FROM pg_control_system()),'lastArchivedAt',(SELECT last_archived_time FROM pg_stat_archiver),'latestWriteAt',(SELECT max("createdAt") FROM "AuditEvent"),'pitrTarget',(SELECT to_char("createdAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') FROM "AuditEvent" WHERE "createdAt" < now()-interval '5 minutes' ORDER BY "createdAt" DESC OFFSET 1 LIMIT 1),'startupParameters',(SELECT jsonb_object_agg(setting,current_setting(setting)) FROM (VALUES ('max_connections'),('max_worker_processes'),('max_wal_senders'),('max_prepared_transactions'),('max_locks_per_transaction')) s(setting))); COMMIT;`;
export const shellQuote=value=>"'"+value.replaceAll("'","'\\''")+"'";
export function snapshotCommand(snapshot){
 if(snapshot.kind==='redis')return "umask 077; temporary=$(mktemp /tmp/arena-recovery-redis.XXXXXX); trap 'rm -f \"$temporary\"' EXIT; export REDISCLI_AUTH=\"${REDISPASSWORD:-${REDIS_PASSWORD:-}}\"; redis-cli --rdb \"$temporary\" >&2 && cat \"$temporary\"";
 if(snapshot.kind==='postgres-status')return 'psql "$DATABASE_URL" -X -q -t -A -v ON_ERROR_STOP=1 -c '+shellQuote(postgresStatusSql);
 if(snapshot.kind==='postgres')return 'pg_dump --format=custom --no-owner "$DATABASE_URL"';
 if(snapshot.kind==='files'&&snapshot.path?.startsWith('/')&&!snapshot.path.includes('..'))return `tar -czf - -C ${shellQuote(snapshot.path)} .`;
 throw new Error('Invalid recovery snapshot.');
}

export function recoveryStartupParameters(control, current={}) {
 const values={};for(const line of control.split('\n')){const match=line.match(/^([a-z_]+) setting:\s+(\d+)\s*$/);if(match)values[match[1]]=Number(match[2]);}
 const names={max_connections:'max_connections',max_worker_processes:'max_worker_processes',max_wal_senders:'max_wal_senders',max_prepared_transactions:'max_prepared_xacts',max_locks_per_transaction:'max_locks_per_xact'};
 return Object.entries(names).map(([setting,label])=>{if(values[label]===undefined)throw new Error('Required recovery parameter missing.');const count=Math.max(values[label],Number(current[setting]||0));if(!Number.isInteger(count)||count<0||count>100000)throw new Error('Invalid recovery parameter.');return `-c ${setting}=${count}`;}).join(' ');
}
