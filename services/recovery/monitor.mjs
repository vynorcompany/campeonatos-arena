import { execFileSync } from 'node:child_process';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { snapshotCommand } from './snapshot-command.mjs';
import { atomicJson } from './vault.mjs';

function railway(config,args){return execFileSync('runuser',['-u',config.operator,'--',config.railwayExecutable||'/usr/local/bin/railway',...args],{encoding:'utf8',timeout:60_000,stdio:['ignore','pipe','pipe']});}
export async function reportRecovery(config,kind,ok){
 if(!config.notificationServiceId||!config.appOrigin)return;
 try{
  const env=JSON.parse(railway(config,['variables','-p',config.projectId,'-e',config.environmentId,'-s',config.notificationServiceId,'--json']));
  const origin=new URL(config.appOrigin);if(origin.protocol!=='https:')throw new Error('HTTPS required.');
  const secret=env.RECOVERY_MONITOR_SECRET;if(!secret||secret.length<32)throw new Error('Monitor credential unavailable.');
  const response=await fetch(new URL('/api/jobs/recovery-monitor',origin),{method:'POST',headers:{authorization:'Bearer '+secret,'content-type':'application/json'},body:JSON.stringify({kind,ok}),signal:AbortSignal.timeout(15_000)});
  if(!response.ok)throw new Error('Monitor receipt failed.');
 }catch{await atomicJson(join(config.directory,'monitor-delivery-failure.json'),{checkedAt:new Date().toISOString(),message:'O resultado da recuperação não foi entregue ao sistema.'});}
}
export function shouldReportProbeFailure(failures, firstFailureAt, now=Date.now()) {
 return failures>=3 && Number.isFinite(Date.parse(firstFailureAt)) && now-Date.parse(firstFailureAt)>=15*60_000;
}
export async function archiveHealth(config){
 const directory=await mkdtemp(join(config.directory,'.health-'));let ok=false,observed=false;
 const probeFile=join(config.directory,'archive-probe.json');
 try{
  const service=config.snapshots.find(snapshot=>snapshot.kind==='postgres-status');if(!service)throw new Error('Database status source missing.');
  const file=join(directory,'ssh-config');await writeFile(file,railway(config,['ssh','config','--dry-run','-p',config.projectId,'-e',config.environmentId,'-s',service.serviceId,'--alias','arena-health','-i',config.identityFile]),{mode:0o600});
  const raw=execFileSync('ssh',['-T','-F',file,'-o','BatchMode=yes','-o','IdentitiesOnly=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+config.knownHosts,'arena-health',snapshotCommand(service)],{encoding:'utf8',timeout:60_000,stdio:['ignore','pipe','pipe']});
  const status=JSON.parse(raw);if(!status||typeof status!=="object"||!("lastArchivedAt" in status))throw new Error("Invalid archive probe response.");observed=true;const archived=Date.parse(status.lastArchivedAt),latest=Date.parse(status.latestWriteAt);
  ok=Number.isFinite(archived)&&!(latest>archived&&Date.now()-archived>300_000);
  await atomicJson(join(config.directory,'archive-status.json'),{ok,checkedAt:new Date().toISOString(),lastArchivedAt:status.lastArchivedAt,latestWriteAt:status.latestWriteAt});
  if(ok) { await atomicJson(probeFile,{lastSuccessAt:new Date().toISOString(),failures:0}); await reportRecovery(config,'wal-archive',true); }
  if(!ok)throw new Error('Continuous archive lag detected.');
  for(const [kind,file,failure,age] of [['independent-copy','status.json','failure.json',2*3_600_000],['pitr-drill','pitr-status.json','pitr-failure.json',8*86_400_000]]){
   let healthy=false;
   try { const state=JSON.parse(await readFile(join(config.directory,file),'utf8'));const completed=Date.parse(state.completedAt||state.checkedAt);healthy=state.ok&&Date.now()-completed<age;try {const failed=JSON.parse(await readFile(join(config.directory,failure),'utf8'));if(Date.parse(failed.checkedAt)>completed)healthy=false;}catch{}}catch{}
   await reportRecovery(config,kind,healthy);
  }
  return {ok:true};
 }catch(error){
  if(!observed){
   let previous={};try{previous=JSON.parse(await readFile(probeFile,'utf8'));}catch{}
   const checkedAt=new Date().toISOString();const firstFailureAt=previous.firstFailureAt||checkedAt;
   const failures=(previous.failures||0)+1;
   await atomicJson(probeFile,{lastSuccessAt:previous.lastSuccessAt,firstFailureAt,failures,checkedAt,errorCode:'PROBE_UNAVAILABLE'});
   // A single SSH timeout is not evidence that WAL archiving failed.
   if(shouldReportProbeFailure(failures,firstFailureAt))await reportRecovery(config,'wal-archive',false);
  }else if(!ok)await reportRecovery(config,'wal-archive',false);
  throw error;
 }finally{await rm(directory,{recursive:true,force:true});}
}
if(process.argv[1]?.endsWith('/monitor.mjs')) void (async()=>{try{console.log(JSON.stringify(await archiveHealth(JSON.parse(await readFile(process.argv[2],'utf8')))))}catch{console.error('Falha na verificação do arquivamento contínuo.');process.exitCode=1;}})();
