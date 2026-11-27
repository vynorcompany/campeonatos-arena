import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { tournamentDirectorySchema, tournamentDirectoryQuerySchema } from "../src/lib/backend/contracts/tournament-directory";
function load(file: string, dependencies: Record<string, unknown>, extra: Record<string, unknown> = {}) {
 const exports: Record<string, Function> = {};
 vm.runInNewContext(ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,...extra,require(name:string){if(name==="server-only")return{};assert.ok(name in dependencies,name);return dependencies[name];}});
 return exports;
}
test("event directory rejects tenant authority, unsupported filters and private response fields",()=>{
 for(const query of [{arenaId:"foreign"},{status:"LIVE"},{tournamentId:["a","b"]},{tournamentId:"x".repeat(101)}]) assert.equal(tournamentDirectoryQuerySchema.safeParse(query).success,false);
 assert.equal(tournamentDirectoryQuerySchema.safeParse({status:"finished",tournamentId:"own"}).success,true);
 assert.equal(tournamentDirectorySchema.safeParse({activeTournaments:[],selectedTournamentId:null,matches:[],credentials:"private"}).success,false);
 assert.equal(tournamentDirectorySchema.safeParse({activeTournaments:[{id:"own",name:"Event",registrationPhase:"LIVE",categories:[],arenaId:"private"}],selectedTournamentId:null,matches:[]}).success,false);
});
test("event directory scopes active/finished events, denies unauthorized reads and never loads foreign matches",async()=>{
 let view=true, manage=false, results=false;const calls:any[]=[];
 const service=load("src/lib/backend/services/tournament-directory.ts",{
 "@/lib/backend/services/management-session":{requireArenaAccess:async()=>({arenaId:"own"})},
 "@/lib/permissions":{canViewModule:()=>view,canPerformPermission:(key:string)=>key==="tournaments:manage"?manage:results},
 "@/lib/prisma":{prisma:{tournament:{findMany:async(args:any)=>{calls.push(["events",args]);return[{id:"event",name:"Event",registrationPhase:"LIVE",categories:[]}];}},categoryMatch:{findMany:async(args:any)=>{calls.push(["matches",args]);return[];}}}},
 "../contracts/tournament-directory":{tournamentDirectorySchema},
 });
 await service.resolveTournamentDirectory({tournamentId:"foreign"});assert.equal(calls.length,1);assert.equal(calls[0][1].where.arenaId,"own");assert.equal(calls[0][1].where.registrationPhase.not,"FINISHED");assert.equal(calls[0][1].select.categories.where.active,true);
 calls.length=0;await service.resolveTournamentDirectory({status:"finished",tournamentId:"event"});assert.equal(calls[0][1].where.registrationPhase,"FINISHED");assert.equal(calls[1][1].where.competition.category.tournamentId,"event");assert.equal(calls[1][1].where.competition.category.tournament.arenaId,"own");assert.equal(calls[1][1].where.competition.category.active,true);
 for(const permission of ["manage","results"]){manage=permission==="manage";results=permission==="results";calls.length=0;await service.resolveTournamentDirectory({tournamentId:"event"});assert.equal(calls.length,1);}
 view=false;calls.length=0;await assert.rejects(service.resolveTournamentDirectory({}),/Sem permissão/);assert.equal(calls.length,0);
 const page=readFileSync("src/app/(app)/torneios/page.tsx","utf8");assert.doesNotMatch(page,/@prisma|lib\/prisma|backend\/services/);assert.match(page,/await getTournamentDirectory/);
});

test("event directory frontend forwards bounded filters/session and sanitizes rejected backend promises", async()=>{
 const calls:any[]=[];
 const transport={readBackendContract:async(...args:unknown[])=>{calls.push(args);return {activeTournaments:[],selectedTournamentId:null,matches:[]};}};
 const client=load("src/lib/tournaments/directory.ts",{
 "@/lib/backend/http-client":transport,
 "@/lib/backend/management-context-client":{managementCookieHeader:async()=>"padel_session=synthetic"},
 "@/lib/backend/contracts/tournament-directory":{tournamentDirectoryQuerySchema,tournamentDirectorySchema},
 },{process:{env:{VX4_BACKEND_ORIGIN:"http://backend.test"}},URLSearchParams});
 await client.getTournamentDirectory({status:"finished",tournamentId:"event & another"});
 assert.equal(calls[0][1],"/api/management/tournaments/directory?status=finished&tournamentId=event+%26+another");assert.equal(calls[0][3].cookie,"padel_session=synthetic");
 transport.readBackendContract=async()=>{throw Error("private database connection");};
 await assert.rejects(client.getTournamentDirectory({}),/^Error: Não foi possível consultar os eventos\.$/);
});
