import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
const require = createRequire(import.meta.url);
function fixture() {
  let sends = 0, issued = 0, invalidated = 0;
  let failSend = false;
  const mocks: Record<string, unknown> = {
    "next/cache": { revalidatePath() {} },
    "@/lib/auth/database": { prisma: { athleteIdentity: { findUnique: async ({where}: any) => where.id ? {passwordHash:"hash"} : where.recoveryEmail === "known@example.test" ? {id:"actor",recoveryEmailVerifiedAt:new Date()} : null }, accountActionToken:{updateMany:async()=>{invalidated++;}} } },
    "@/lib/env": {env:{appUrl:"https://portal.example.test"}},
    "@/lib/backend/services/player-session":{getPublicAthleteIdentity:async()=>({id:"actor"})},
    "@/lib/auth/account-email":{accountEmailIsConfigured:()=>true,sendAccountEmail:async()=>{sends++;if(failSend)throw Error("private provider response");}},
    "@/lib/auth/login-attempts":{activeLoginLock:async()=>false,clearLoginFailures:async()=>{},recordFailedLogin:async()=>{}},
    "bcryptjs":{compare:async(password:string)=>password==="correct-password",hash:async()=>"new-hash"},
    "@/lib/auth/athlete-email-recovery":{athleteEmailKinds:{verify:"VERIFY",reset:"RESET"},issueAthleteEmailToken:async (_db:any,id:string)=>{assert.equal(id,"actor");issued++;return {token:"a".repeat(64),id:"token"};},confirmAthleteRecoveryEmail:async()=>true,resetAthletePasswordByEmail:async()=>true},
  };
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/backend/services/athlete-email-access.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports,Date,URL,require:(name:string)=>name in mocks?mocks[name]:require(name)});
  return {exports,get sends(){return sends;},get issued(){return issued;},get invalidated(){return invalidated;},fail(){failSend=true;}};
}
const form = (values: Record<string,string>) => {const data=new FormData();for(const [k,v] of Object.entries(values))data.set(k,v);return data;};
test("email recovery enrollment requires current password and uses session identity",async()=>{
 const f=fixture();
 assert.ok((await f.exports.requestAthleteEmailVerificationAction({},form({email:"known@example.test",currentPassword:"wrong-password",identityId:"victim"}))).error);
 assert.equal(f.issued,0);
 assert.equal((await f.exports.requestAthleteEmailVerificationAction({},form({email:"known@example.test",currentPassword:"correct-password",identityId:"victim"}))).error,null);
 assert.equal(f.sends,1);
});
test("unknown and verified emails receive identical notice; failed send invalidates token",async()=>{
 const f=fixture();
 const unknown=await f.exports.requestAthleteEmailPasswordResetAction({},form({email:"unknown@example.test"}));
 assert.equal(f.sends,0);
 f.fail();
 const known=await f.exports.requestAthleteEmailPasswordResetAction({},form({email:"known@example.test"}));
 assert.equal(known.success,unknown.success);
 assert.equal(known.error,null);
 assert.equal(f.invalidated,1);
});
test("bot trap blocks requests before sending",async()=>{
 const f=fixture();assert.ok((await f.exports.requestAthleteEmailPasswordResetAction({},form({email:"known@example.test",contactWebsite:"bot"}))).error);assert.equal(f.issued,0);
});
