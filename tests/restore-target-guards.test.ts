import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import test from 'node:test';

const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash';
const script = resolve('services/db-backup/restore-test.sh').replaceAll('\\','/').replace(/^([A-Z]):/i,(_,drive) => '/'+drive.toLowerCase());
function execute(mode: string) {
  return spawnSync(bash,['-c',`
psql() {
 case "$*" in
  *pg_control_system*) if [ "$1" = source ] || [ "$PROBE_MODE" = alias ]; then echo cluster:production; else echo separate:arena_restore_probe; fi ;;
  *'SELECT current_database()'*) if [ "$PROBE_MODE" = wrong_name ]; then echo production; else echo arena_restore_probe; fi ;;
  *'SELECT count(*) FROM pg_class'*) if [ "$PROBE_MODE" = occupied ]; then echo 2; else echo 0; fi ;;
 esac
}
aws() { if [ "$2" = ls ]; then case "$*" in *--only-show-errors*) return 90;; esac; echo '2026-01-01 01:00:00 100 arena/backup.dump'; else echo DOWNLOAD_CALLED; fi; }
pg_restore() { case "$*" in *--clean*|*--if-exists*) return 80;; esac; echo RESTORE_CALLED; }
. '${script}'
`],{encoding:'utf8',env:{...process.env,PROBE_MODE:mode,DATABASE_URL:'source',RESTORE_DATABASE_URL:'target',RESTORE_CONFIRM:'RESTORE_DISPOSABLE_DATABASE',S3_BUCKET:'fixture',S3_ENDPOINT:'fixture',AWS_ACCESS_KEY_ID:'fixture',AWS_SECRET_ACCESS_KEY:'fixture',AWS_DEFAULT_REGION:'fixture'}});
}
test('restore rejects production aliases and occupied or incorrectly named targets before downloading', { skip: !existsSync(bash) }, () => {
 for(const mode of ['alias','occupied','wrong_name']) {
  const result=execute(mode);assert.notEqual(result.status,0,result.stdout+result.stderr);
  assert.doesNotMatch(result.stdout,/DOWNLOAD_CALLED|RESTORE_CALLED/);
 }
});
test('restore accepts an empty isolated target without destructive restore flags', { skip: !existsSync(bash) }, () => {
 const result=execute('empty');assert.equal(result.status,0,result.stderr);
 assert.match(result.stdout,/DOWNLOAD_CALLED/);assert.match(result.stdout,/RESTORE_CALLED/);
});
