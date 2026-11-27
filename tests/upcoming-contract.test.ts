import assert from "node:assert/strict";
import test from "node:test";
import {upcomingInputSchema,upcomingOutcomeSchema}from"../src/lib/backend/contracts/upcoming";
import{UpcomingOperationError,publicUpcomingError}from"../src/lib/backend/upcoming-operation-error";
test("TV and plan mutation contracts accept explicit arrays and reject caller authority, duplicate scalars and misplaced files",()=>{
 assert.ok(upcomingInputSchema("plan-create").safeParse({fields:{dueDays:["5","10"]}}).success);
 for(const fields of[{actorId:["foreign"]},{arenaId:["foreign"]},{name:["one","two"]}])assert.equal(upcomingInputSchema("plan-create").safeParse({fields}).success,false);
 assert.equal(upcomingInputSchema("manual-create").safeParse({fields:{},file:{name:"x.png",type:"image/png",base64:"AAAA"}}).success,false);
 assert.equal(upcomingOutcomeSchema.safeParse({error:null,passwordHash:"private"}).success,false);
});
test("TV validation exposes deliberate feedback without infrastructure or provider secrets",()=>{
 assert.equal(publicUpcomingError(new UpcomingOperationError("Selecione um plano.")),"Selecione um plano.");
 assert.equal(publicUpcomingError(new Error("Envie uma foto JPG, PNG ou WEBP.")),"Envie uma foto JPG, PNG ou WEBP.");
 assert.equal(publicUpcomingError(new Error("postgres://private:secret@database")),null);
});
test("TV mutation transport forwards only management cookies, validates outcomes and never retries uncertain writes",async()=>{
 const{readFileSync}=await import("node:fs");const{default:ts}=await import("typescript");const{default:vm}=await import("node:vm");
 const{upcomingFields,upcomingFileOperations,upcomingFileLimit,upcomingInputSchema,upcomingOutcomeSchema}=await import("../src/lib/backend/contracts/upcoming");const{backendOrigin}=await import("../src/lib/backend/http-client");
 const exports:Record<string,(...args:any[])=>Promise<any>>={};let calls=0,fail=false;
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/backend/upcoming-client.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,Error,AbortSignal,File,Buffer,require:(name:string)=>name==="next/headers"?{headers:async()=>new Headers({origin:"https://frontend.invalid"})}:name.includes("management-context-client")?{managementCookieHeader:async()=>"padel_session=staff; padel_arena=own"}:name.includes("http-client")?{backendOrigin}:name.includes("contracts/upcoming")?{upcomingFields,upcomingFileOperations,upcomingFileLimit,upcomingInputSchema,upcomingOutcomeSchema}:{},fetch:async(url:URL,init:RequestInit)=>{calls++;assert.equal(url.origin,"https://backend.invalid");assert.equal(init.redirect,"error");assert.equal(init.cache,"no-store");assert.equal((init.headers as Record<string,string>).cookie,"padel_session=staff; padel_arena=own");if(fail)throw Error("uncertain write");return Response.json({error:null});}});
 const form=new FormData();form.set("name","Own plan");form.append("dueDays","5");form.append("dueDays","10");form.set("actorId","must-not-forward");const payload=await exports.upcomingPayload("plan-create",form);assert.deepEqual(JSON.parse(JSON.stringify(payload.fields)),{name:["Own plan"],dueDays:["5","10"]});
 await exports.remoteUpcomingMutation("https://backend.invalid","plan-create",payload);fail=true;await assert.rejects(exports.remoteUpcomingMutation("https://backend.invalid","plan-create",payload),/uncertain write/);assert.equal(calls,2);
});
