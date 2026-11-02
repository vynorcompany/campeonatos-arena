import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { spawn, execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, mkdir, access, writeFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { join, isAbsolute } from 'node:path';
import { Readable } from 'node:stream';
import { encryptStream, atomicJson } from './vault.mjs';

export { shellQuote, snapshotCommand } from "./snapshot-command.mjs";
import { snapshotCommand } from "./snapshot-command.mjs";

function command(program,args,options={}){return execFileSync(program,args,{maxBuffer:10*1024*1024,timeout:60_000,stdio:['ignore','pipe','pipe'],...options});}
function railway(config,args){const prefix=config.operator?['-u',config.operator,'--',config.railwayExecutable||'/usr/local/bin/railway']:[];return command(config.operator?'runuser':config.railwayExecutable||'railway',[...prefix,...args]);}
function variables(config,service){return JSON.parse(railway(config,['variables','-p',config.projectId,'-e',config.environmentId,'-s',service,'--json']).toString());}
async function consumeProcess(child,destination,key,immutable){
 let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk.toString().slice(0,1000)});
 const ended=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error('Remote snapshot failed.')))});
 try{const [result]=await Promise.all([encryptStream(child.stdout,destination,key,{immutable}),ended]);return result;}catch(error){child.kill('SIGTERM');throw error;}
}
export async function runRecovery(config){
 if(!isAbsolute(config.directory)||!isAbsolute(config.keyFile))throw new Error('Recovery paths must be absolute.');
 const key=await readFile(config.keyFile);const root=config.directory;await mkdir(root,{recursive:true,mode:0o700});
 const keyMode=(await stat(config.keyFile)).mode&0o777;if(keyMode&0o077)throw new Error('Recovery key must be private.');
 const manifest={startedAt:new Date().toISOString(),revision:config.revision,objects:[],snapshots:[]};
 const objects=join(root,'objects');await mkdir(objects,{recursive:true,mode:0o700});
 const temporary=await mkdtemp(join(root,'.run-'));
 try{
  for(const source of config.sources){
   const env=variables(config,source.serviceId),map=source.variables;
   const client=new S3Client({endpoint:env[map.endpoint],region:env[map.region]||'auto',forcePathStyle:true,credentials:{accessKeyId:env[map.key],secretAccessKey:env[map.secret]}});
   const bucket=env[map.bucket],prefix=(env[map.prefix]||source.prefix||'').replace(/^\/+/, '').replace(/\/?$/, '/');if(!bucket||!prefix)throw new Error('Recovery bucket/prefix missing.');
   let token;
   do{
    const page=await client.send(new ListObjectsV2Command({Bucket:bucket,Prefix:prefix,ContinuationToken:token}));
    const contents=page.Contents||[];
    for(let offset=0;offset<contents.length;offset+=8){
     const batch=await Promise.allSettled(contents.slice(offset,offset+8).map(async object=>{
     if(!object.Key||object.Key.endsWith('/'))return;
     const id=createHash('sha256').update(bucket+'\0'+object.Key+'\0'+object.ETag).digest('hex'),name=id+'.enc',target=join(objects,name);
     try{await access(target)}catch{
      const response=await client.send(new GetObjectCommand({Bucket:bucket,Key:object.Key,IfMatch:object.ETag}));
      const pending=join(temporary,name);const result=await encryptStream(response.Body,pending,key);
      if(result.bytes!==Number(object.Size))throw new Error('Recovery download size mismatch.');
      await import('node:fs/promises').then(fs=>fs.rename(pending,target));
      if(config.immutable)command('chattr',['+i',target]);
      await atomicJson(target+'.json',result);
     }
     const digest=JSON.parse(await readFile(target+'.json','utf8'));
     manifest.objects.push({source:source.name,key:object.Key,etag:object.ETag,lastModified:object.LastModified,file:'objects/'+name,...digest});
     }));
     const failed=batch.find(result=>result.status==='rejected');if(failed)throw failed.reason;
    }
    token=page.IsTruncated?page.NextContinuationToken:undefined;
   }while(token);
   client.destroy();
  }
  for(const snapshot of config.snapshots||[]){
   const alias='arena-recovery',configFile=join(temporary,'ssh-config');
   const sshConfig=railway(config,['ssh','config','--dry-run','-p',config.projectId,'-e',config.environmentId,'-s',snapshot.serviceId,'--alias',alias,'-i',config.identityFile]);
   await writeFile(configFile,sshConfig,{mode:0o600});
   const filename=`${new Date().toISOString().replaceAll(':','-')}-${randomUUID()}.enc`,destination=join(objects,filename);
   const sshArgs=['-T','-F',configFile,'-o','BatchMode=yes','-o','IdentitiesOnly=yes','-o','StrictHostKeyChecking=accept-new','-o','UserKnownHostsFile='+config.knownHosts,alias,snapshotCommand(snapshot)];
   if(snapshot.kind==='postgres-status'){
    const content=command('ssh',sshArgs);const status=JSON.parse(content.toString());
    if(!status.pitrTarget||!status.systemIdentifier)throw new Error('No recovery target available.');
    const archived=Date.parse(status.lastArchivedAt),latest=Date.parse(status.latestWriteAt);
    if(!Number.isFinite(archived)||(latest>archived&&Date.now()-archived>300_000))throw new Error('Continuous archive lag exceeds five minutes.');
    manifest.postgresStatus=status;const result=await encryptStream(Readable.from([content]),destination,key,{immutable:config.immutable});
    manifest.snapshots.push({name:snapshot.name,kind:snapshot.kind,file:'objects/'+filename,...result});continue;
   }
   const child=spawn('ssh',sshArgs,{stdio:['ignore','pipe','pipe']});
   const result=await consumeProcess(child,destination,key,config.immutable);
   manifest.snapshots.push({name:snapshot.name,kind:snapshot.kind,file:'objects/'+filename,...result});
  }
  for(const service of config.configurationServices||[]){
   const data=Buffer.from(JSON.stringify(variables(config,service.serviceId))),name=randomUUID()+'.enc';
   const result=await encryptStream(Readable.from([data]),join(objects,name),key,{immutable:config.immutable});
   manifest.snapshots.push({name:service.name,kind:'configuration',file:'objects/'+name,...result});
  }
  manifest.completedAt=new Date().toISOString();
  const manifestFile=join(root,`manifest-${manifest.completedAt.replaceAll(':','-')}.enc`);
  await encryptStream(Readable.from([Buffer.from(JSON.stringify(manifest))]),manifestFile,key,{immutable:config.immutable});
  await atomicJson(join(root,'status.json'),{ok:true,startedAt:manifest.startedAt,completedAt:manifest.completedAt,revision:config.revision,objects:manifest.objects.length,snapshots:manifest.snapshots.length,manifest:manifestFile});
  await (await import("./monitor.mjs")).reportRecovery(config,"independent-copy",true);
  return {objects:manifest.objects.length,snapshots:manifest.snapshots.length};
 }catch(error){await atomicJson(join(root,'failure.json'),{ok:false,checkedAt:new Date().toISOString(),message:'A cópia independente não foi concluída. Verifique o serviço de recuperação.'});await (await import("./monitor.mjs")).reportRecovery(config,"independent-copy",false);throw new Error('Independent recovery failed; source data was not modified.');}
 finally{await rm(temporary,{recursive:true,force:true});}
}
if(process.argv[1]?.endsWith('/recovery.mjs')){
 try{const config=JSON.parse(await readFile(process.argv[2],'utf8'));console.log(JSON.stringify(await runRecovery(config)));}catch{console.error('Falha na cópia independente de recuperação.');process.exitCode=1;}
}
