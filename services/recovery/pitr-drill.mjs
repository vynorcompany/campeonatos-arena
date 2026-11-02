import { readFile, mkdtemp, mkdir, rm, chown, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { recoveryStartupParameters } from './snapshot-command.mjs';
import { decryptStream, atomicJson } from './vault.mjs';

const image='ghcr.io/railwayapp-templates/postgres-ssl:18@sha256:4fc833b43d2aaf6ecc9b18615f5533602b723a32d0e2efe2dae8ca0f7217c863';
function command(args,options={}){return execFileSync('docker',args,{encoding:'utf8',timeout:180_000,maxBuffer:4*1024*1024,stdio:['ignore','pipe','pipe'],...options});}
export async function runPitrDrill(config){
 process.umask(0o077);const started=Date.now(),key=await readFile(config.keyFile),status=JSON.parse(await readFile(join(config.directory,'status.json'),'utf8'));
 if(!status.ok||Date.now()-Date.parse(status.completedAt)>3_600_000*2)throw new Error('A recent complete independent copy is required.');
 const directory=await mkdtemp(join(config.directory,'drill-')),name='arena-pitr-'+randomUUID();let created=false;
 try{
  const plaintext=join(directory,'manifest.json');await decryptStream(status.manifest,plaintext,key);const manifest=JSON.parse(await readFile(plaintext,'utf8'));
  const target=manifest.postgresStatus?.pitrTarget;
  if(!target||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(target))throw new Error('A verified recovery target is required.');
  const postgresTarget=target.replace('T',' ').replace('Z','+00');
  const repo=join(directory,'repository');await mkdir(repo,{mode:0o700});
  const objects=manifest.objects.filter(object=>object.source===(config.pitrSource||'continuous-recovery'));
  if(!objects.length)throw new Error('Physical recovery repository missing.');
  for(let offset=0;offset<objects.length;offset+=16){
   const results=await Promise.allSettled(objects.slice(offset,offset+16).map(async object=>{
    const match=object.key.match(/(?:^|\/)((?:archive|backup)\/main\/.+)$/);if(!match)throw new Error('Unexpected physical repository path.');
    const relative=match[1];if(relative.split('/').some(part=>part==='..'||part==='.'||!part))throw new Error('Unsafe repository path.');
    if(!/^objects\/[a-zA-Z0-9-]+\.enc$/.test(object.file))throw new Error('Unsafe vault object reference.');
    const destination=join(repo,relative);await mkdir(dirname(destination),{recursive:true,mode:0o700});
    const checked=await decryptStream(join(config.directory,object.file),destination,key);
    if(checked.sha256!==object.sha256||checked.bytes!==object.bytes)throw new Error('Repository object checksum mismatch.');
   }));const failed=results.find(result=>result.status==='rejected');if(failed)throw failed.reason;
  }
  const uid=Number(command(['run','--rm','--network','none','--entrypoint','id',image,'-u','postgres']).trim());
  const gid=Number(command(['run','--rm','--network','none','--entrypoint','id',image,'-g','postgres']).trim());
  if(!Number.isInteger(uid)||uid===0||!Number.isInteger(gid)||gid===0)throw new Error('Unprivileged recovery account required.');
  execFileSync('chown',['-R',`${uid}:${gid}`,repo],{stdio:'ignore'});
  const pgdata=join(directory,'pgdata');await mkdir(pgdata,{mode:0o700});await chown(pgdata,uid,gid);
  command(['run','-d','--name',name,'--label','vynor.restore-drill=arena-pitr','--network','none','--memory','2g','--cpus','1.5','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--user',`${uid}:${gid}`,'--mount',`type=bind,src=${pgdata},dst=/pgdata`,'--tmpfs',`/tmp:rw,uid=${uid},gid=${gid},size=256m`,'--mount',`type=bind,src=${repo},dst=/repo,readonly`,'--entrypoint','sleep',image,'infinity']);created=true;
  const backupArgs=['--config=/dev/null','--stanza=main','--repo1-type=posix','--repo1-path=/repo','--log-level-console=warn'];
  const info=JSON.parse(command(['exec',name,'pgbackrest',...backupArgs,'--output=json','info']));
  const backups=info[0].backup.filter(backup=>backup.timestamp.stop*1000<Date.parse(target)).sort((a,b)=>b.timestamp.stop-a.timestamp.stop);
  if(!backups.length)throw new Error('No backup precedes the target.');
  command(['exec',name,'pgbackrest',...backupArgs,'--pg1-path=/pgdata','--set='+backups[0].label,'--type=time','--target='+postgresTarget,'--target-action=promote','restore']);
  command(['exec',name,'sh','-c',"printf 'local all all trust\\n' > /tmp/pg_hba.conf"]);
  const control=command(['exec','-e','LC_ALL=C',name,'pg_controldata','/pgdata']);
  const required=recoveryStartupParameters(control,manifest.postgresStatus.startupParameters);
  command(['exec',name,'pg_ctl','-D','/pgdata','-l','/tmp/postgres-restore.log','-o',"-c listen_addresses='' -c unix_socket_directories=/pgdata -c port=55432 -c archive_mode=off -c archive_command=/bin/true -c shared_preload_libraries='' -c ssl=off -c hba_file=/tmp/pg_hba.conf -c logging_collector=off -c shared_buffers=64MB "+required,'-w','-t','120','start']);
  let promoted=false;
  for(let attempt=0;attempt<180;attempt++){
   const state=command(['exec',name,'psql','-h','/pgdata','-p','55432','-U','postgres','-d','railway','-X','-At','-c','SELECT NOT pg_is_in_recovery()']).trim();
   if(state==='t'){promoted=true;break;}
   await new Promise(resolve=>setTimeout(resolve,1000));
  }
  if(!promoted)throw new Error('Recovery target was not reached within the drill window.');
  const sql=`SELECT jsonb_build_object('recoveryFinished',NOT pg_is_in_recovery(),'systemIdentifier',(SELECT system_identifier::text FROM pg_control_system()),'arenas',(SELECT count(*) FROM "Arena"),'players',(SELECT count(*) FROM "Player"),'financialEntries',(SELECT count(*) FROM "FinancialEntry"),'eventsAfterTarget',(SELECT count(*) FROM "AuditEvent" WHERE "createdAt">'${postgresTarget}'::timestamptz))`;
  const checked=JSON.parse(command(['exec',name,'psql','-h','/pgdata','-p','55432','-U','postgres','-d','railway','-X','-At','-v','ON_ERROR_STOP=1','-c',sql]));
  if(!checked.recoveryFinished||checked.systemIdentifier!==manifest.postgresStatus.systemIdentifier||!checked.arenas||checked.eventsAfterTarget!==0)throw new Error('Point-in-time validation failed.');
  const result={ok:true,checkedAt:new Date().toISOString(),target,backup:backups[0].label,elapsedSeconds:Math.round((Date.now()-started)/1000),...checked};
  await atomicJson(join(config.directory,'pitr-status.json'),result);await (await import('./monitor.mjs')).reportRecovery(config,'pitr-drill',true);return result;
 }catch(error){let serverLog='';if(created){try{serverLog=command(['exec',name,'cat','/tmp/postgres-restore.log']);}catch{}}await writeFile(join(config.directory,'pitr-error.log'),String(error.stack||error)+'\n'+String(error.stderr||'')+'\n'+String(error.stdout||'')+'\n'+serverLog,{mode:0o600});await atomicJson(join(config.directory,'pitr-failure.json'),{ok:false,checkedAt:new Date().toISOString()});await (await import('./monitor.mjs')).reportRecovery(config,'pitr-drill',false);throw error;}finally{if(created)command(['rm','-f',name]);await rm(directory,{recursive:true,force:true});}
}
if(process.argv[1]?.endsWith('/pitr-drill.mjs')){try{console.log(JSON.stringify(await runPitrDrill(JSON.parse(await readFile(process.argv[2],'utf8')))))}catch{console.error('Falha no teste isolado de recuperação no tempo.');process.exitCode=1;}}
