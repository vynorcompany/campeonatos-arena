import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error plain Node recovery module
import { recoveryReadCommand, recoveryFailureDiagnostic } from '../services/recovery/read-command.mjs';
test('recovery retries a transient read once and never retries authorization failures',()=>{
 let calls=0,pauses=0;
 const value=recoveryReadCommand('ssh',['synthetic'],{},()=>{calls++;if(calls===1)throw Object.assign(new Error('private details'),{status:255,stderr:Buffer.from('Connection reset')});return 'ok';},()=>{pauses++;});
 assert.equal(value,'ok');assert.equal(calls,2);assert.equal(pauses,1);
 calls=0;assert.throws(()=>recoveryReadCommand('ssh',[],{},()=>{calls++;throw Object.assign(new Error('secret'),{status:255,stderr:Buffer.from('Permission denied')});},()=>{}));assert.equal(calls,1);
 calls=0;assert.throws(()=>recoveryReadCommand('ssh',[],{},()=>{calls++;throw Object.assign(new Error('timeout'),{code:'ETIMEDOUT'});},()=>{}));assert.equal(calls,2);
});
test('recovery receipts retain a closed diagnostic and never leak provider or SSH secrets',()=>{
 const result=recoveryFailureDiagnostic({code:'REMOTE_SNAPSHOT',stderr:'password=secret',snapshot:'private/path',message:'sensitive'},'snapshot');
 assert.deepEqual(result,{stage:'snapshot',errorCode:'REMOTE_SNAPSHOT'});assert(!JSON.stringify(result).includes('secret'));
 assert.deepEqual(recoveryFailureDiagnostic({code:'secret-token'},'secret-bucket'),{stage:'preparation',errorCode:'RECOVERY_STEP_FAILED'});
});
