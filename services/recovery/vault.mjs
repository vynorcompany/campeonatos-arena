import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { open, chmod, readFile, writeFile, rename, stat } from 'node:fs/promises';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawnSync } from 'node:child_process';

const magic=Buffer.from('ARECOV01');
export async function encryptStream(stream, destination, key, { immutable=false }={}) {
 if(key.length!==32)throw new Error('Recovery key must contain 32 bytes.');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv),hash=createHash('sha256');let bytes=0;
 const digest=new Transform({transform(chunk,_encoding,done){bytes+=chunk.length;hash.update(chunk);done(null,chunk)}});
 const file=await open(destination,'wx',0o600);await file.write(Buffer.concat([magic,iv]));await file.close();
 await pipeline(stream,digest,cipher,createWriteStream(destination,{flags:'a',mode:0o600}));
 const handle=await open(destination,'a');await handle.write(cipher.getAuthTag());await handle.sync();await handle.close();
 await chmod(destination,0o400);
 if(immutable){const result=spawnSync('chattr',['+i',destination],{stdio:'ignore'});if(result.status!==0)throw new Error('Recovery filesystem does not support immutable files.');}
 return {sha256:hash.digest('hex'),bytes};
}
export async function decryptStream(source,destination,key){
 const size=(await stat(source)).size;if(size<36)throw new Error('Incomplete recovery envelope.');
 const file=await open(source,'r');const header=Buffer.alloc(20),tag=Buffer.alloc(16);await file.read(header,0,20,0);await file.read(tag,0,16,size-16);await file.close();
 if(!header.subarray(0,8).equals(magic))throw new Error('Invalid recovery envelope.');
 const decipher=createDecipheriv('aes-256-gcm',key,header.subarray(8));decipher.setAuthTag(tag);
 const hash=createHash('sha256');let bytes=0;
 const digest=new Transform({transform(chunk,_encoding,done){bytes+=chunk.length;hash.update(chunk);done(null,chunk)}});
 const input=size===36?Readable.from([]):createReadStream(source,{start:20,end:size-17});
 await pipeline(input,decipher,digest,createWriteStream(destination,{flags:'wx',mode:0o600}));
 return {sha256:hash.digest('hex'),bytes};
}
export async function atomicJson(path,value){const temporary=path+'.new';await writeFile(temporary,JSON.stringify(value,null,2),{mode:0o600});await rename(temporary,path);}
