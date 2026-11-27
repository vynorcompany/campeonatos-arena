import assert from"node:assert/strict";
import test from"node:test";
import{readFileSync}from"node:fs";
import{planListQuerySchema,planDetailQuerySchema}from"../src/lib/backend/contracts/plan-queries";
import{upcomingInputSchema,upcomingOutcomeSchema}from"../src/lib/backend/contracts/upcoming";
test("fixed-plan contracts reject caller scope and preserve explicit arrays and success results",()=>{
 assert.equal(planListQuerySchema.safeParse({arenaId:"foreign"}).success,false);assert.equal(planDetailQuerySchema.safeParse({id:"own",playerId:"foreign"}).success,false);
 assert.ok(upcomingInputSchema("fixed-options").safeParse({fields:{planId:["own"],dueDays:["5","10"],reservationCredits:["8"]}}).success);
 assert.equal(upcomingInputSchema("fixed-enroll").safeParse({fields:{firstPaid:["on","off"]}}).success,false);assert.ok(upcomingOutcomeSchema.safeParse({error:null,success:true}).success);
});
test("plan renderers do not import a database and decode explicit dates only for existing display semantics",()=>{
 for(const file of["src/app/(app)/proximos-jogos/patrocinios/page.tsx","src/app/(app)/proximos-jogos/patrocinios/[planId]/page.tsx"]){const source=readFileSync(file,"utf8");assert.doesNotMatch(source,/arenaDatabase|withArenaTransaction|prisma\./);assert.match(source,/getPlan(List|Detail)/);}
});
test("fixed-plan domain errors never return arbitrary provider or infrastructure messages",async()=>{
 const{readFileSync:domainRead}=await import("./helpers/domain-source");const{default:ts}=await import("typescript");const{default:vm}=await import("node:vm");const exports:Record<string,(form:FormData)=>Promise<{error?:string}>>={};
 vm.runInNewContext(ts.transpileModule(domainRead("src/lib/actions/fixed-court-plans.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,FormData,Error,require:(name:string)=>name.includes("auth/guards")?{requireModuleEdit:async()=>({arenaId:"own"}),requirePermission:async()=>({arenaId:"own"})}:name.includes("/rls")?{withArenaTransaction:async()=>{throw Error("private-provider-secret")}}:{}});
 const form=new FormData();form.set("startsAt","2040-01-01");form.set("endsAt","2040-02-01");assert.deepEqual(JSON.parse(JSON.stringify(await exports.enrollFixedCourtPlanAction(form))),{error:"Não foi possível vincular o cliente."});assert.deepEqual(JSON.parse(JSON.stringify(await exports.endFixedCourtPlanAction(form))),{error:"Não foi possível encerrar o plano."});
});
