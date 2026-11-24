import { execFileSync } from 'node:child_process';

/** Retry only explicitly read-only recovery commands, never a restore or a payment. */
export function transientRecoveryRead(error) {
 if (['ETIMEDOUT','ECONNRESET','EAI_AGAIN','ECONNREFUSED'].includes(error?.code)) return true;
 const diagnostic=String(error?.stderr??'');
 if (/permission denied|authentication failed|could not authenticate|invalid credentials|unauthorized|forbidden|invalid (token|key)|host key verification failed/i.test(diagnostic)) return false;
 return error?.status===255 || /timed? out|connection reset|connection closed|temporarily unavailable|bad gateway|service unavailable|ECONNRESET|EAI_AGAIN/i.test(diagnostic);
}
export function recoveryReadCommand(program,args,options={},execute=execFileSync,pause=ms=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms)) {
 for(let attempt=0;;attempt++){
  try{return execute(program,args,options);}
  catch(error){if(attempt>=1||!transientRecoveryRead(error))throw error;pause(750);}
 }
}
/** Persist a closed diagnostic, not arbitrary stderr, URLs, command text or credentials. */
export function recoveryFailureDiagnostic(error,stage) {
 const known=['ETIMEDOUT','ECONNRESET','EAI_AGAIN','ECONNREFUSED','ENOSPC','EACCES','REMOTE_SNAPSHOT'];
 const code=known.includes(error?.code)?error.code:error?.status===255?'SSH_TRANSPORT':error?.$metadata?.httpStatusCode===403?'STORAGE_ACCESS_DENIED':error?.$metadata?.httpStatusCode===412?'SOURCE_CHANGED':'RECOVERY_STEP_FAILED';
 return {stage:['storage','application','snapshot','configuration','manifest'].includes(stage)?stage:'preparation',errorCode:code};
}
