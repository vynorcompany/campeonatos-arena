import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import * as contracts from "../src/lib/backend/contracts/tournament-workspaces";
function load(file:string,dependencies:Record<string,unknown>,extra:Record<string,unknown>={}){
 const exports:Record<string,Function>={};vm.runInNewContext(ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,...extra,require(name:string){if(name==="server-only")return{};assert.ok(name in dependencies,name);return dependencies[name];}});return exports;
}
const raw={id:"event",name:"Event",description:"Literal <script>text</script>",rules:"Regulamento",onlinePaymentEnabled:false,publicSlug:"event",registrationPhase:"REGISTRATIONS",creationMode:"PUBLIC",createdAt:new Date("2035-01-01T02:00:00Z"),updatedAt:new Date("2035-01-02T03:00:00Z"),firstBonusLimit:2,firstBonusUntil:new Date("2035-01-02T12:00:00Z"),arena:{slug:"own"},categories:[{id:"category",name:"Trio",registrationType:"PAIR",_count:{registrations:7},competition:{format:"TRIO",status:"FINISHED",_count:{pairs:3}}}]};
const wire={view:"overview",tournament:{...raw,createdAt:raw.createdAt.toISOString(),updatedAt:raw.updatedAt.toISOString(),firstBonusUntil:raw.firstBonusUntil.toISOString(),publicRegistrations:[{id:"registration",leadName:"Atleta",partnerName:"",createdAt:"2035-01-01T12:00:00.000Z"}]}};
test("event overview rejects hidden ownership, contact and provider fields",()=>{
 assert.equal(contracts.tournamentWorkspaceQuerySchema.safeParse({view:"overview",tournamentId:"event"}).success,true);
 assert.equal(contracts.tournamentOverviewSchema.safeParse(wire).success,true);
 assert.equal(contracts.tournamentOverviewSchema.safeParse({...wire,tournament:{...wire.tournament,responsiblePhone:"private"}}).success,false);
 assert.equal(contracts.tournamentOverviewSchema.safeParse({...wire,tournament:{...wire.tournament,arena:{slug:"own",createdById:"private"}}}).success,false);
 assert.equal(contracts.tournamentOverviewSchema.safeParse({...wire,tournament:{...wire.tournament,publicRegistrations:[{...wire.tournament.publicRegistrations[0],paymentCheckoutUrl:"private"}]}}).success,false);
});
test("event overview scopes both reads and limits bonus names to confirmed paid registrations before the inclusive deadline",async()=>{
 const calls:any[]=[];let manage=true,exists=true,limit=2;
 const service=load("src/lib/backend/services/tournament-workspaces.ts",{
 "@/lib/auth/guards":{requireModuleView:async(module:string)=>{assert.equal(module,"tournaments");return{arenaId:"own"};}},"@/lib/permissions":{canPerformPermission:(permission:string)=>{assert.equal(permission,"tournaments:manage");return manage;}},
 "@/lib/arena-database":{arenaDatabase:(arena:string)=>{assert.equal(arena,"own");return{tournament:{findFirst:async(args:any)=>{calls.push(["event",args]);return exists?{...raw,firstBonusLimit:limit}:null;}},publicTournamentRegistration:{findMany:async(args:any)=>{calls.push(["bonus",args]);return[{id:"registration",leadName:"Atleta",partnerName:"",createdAt:new Date("2035-01-01T12:00:00Z")}];}}};}},"../contracts/tournament-workspaces":contracts,
 });
 const result=await service.resolveTournamentOverview("event");assert.equal(result.tournament.createdAt,"2035-01-01T02:00:00.000Z");assert.equal(result.tournament.description,raw.description);assert.equal(result.tournament.categories[0].competition._count.pairs,3);assert.equal(result.tournament.publicRegistrations[0].createdAt,"2035-01-01T12:00:00.000Z");
 const event=calls[0][1],bonus=calls[1][1];assert.equal(event.where.arenaId,"own");assert.equal(event.where.id,"event");assert.equal(event.select.responsiblePhone,undefined);assert.equal(event.select.categories.where.archivedAt,null);assert.equal(event.select.categories.select.competition.select._count.select.pairs.where.active,true);assert.equal(bonus.where.tournamentId,"event");assert.equal(bonus.where.tournament.arenaId,"own");assert.equal(bonus.where.status,"CONFIRMED");assert.equal(bonus.where.paymentStatus,"PAID");assert.equal(bonus.where.createdAt.lte.getTime(),raw.firstBonusUntil.getTime());assert.equal(bonus.take,2);assert.equal(bonus.orderBy.createdAt,"asc");assert.equal(bonus.select.leadPhone,undefined);
 calls.length=0;limit=0;assert.equal((await service.resolveTournamentOverview("event")).tournament.publicRegistrations.length,0);assert.equal(calls.length,1);
 exists=false;calls.length=0;assert.equal((await service.resolveTournamentOverview("foreign")).tournament,null);assert.equal(calls.length,1);
 manage=false;calls.length=0;await assert.rejects(service.resolveTournamentOverview("event"),/Sem permissão/);assert.equal(calls.length,0);
 const page=readFileSync("src/app/(app)/torneios/[tournamentId]/page.tsx","utf8");assert.doesNotMatch(page,/@prisma|lib\/prisma|arenaDatabase|backend\/services/);assert.match(page,/await getTournamentOverview/);assert.match(page,/if \(!tournament\)/);
});
test("event overview frontend preserves date instants, forwards session only and sanitizes transport failures",async()=>{
 const calls:any[]=[];const transport={readBackendContract:async(...args:unknown[])=>{calls.push(args);return wire;}};
 const client=load("src/lib/tournaments/workspaces.ts",{"@/lib/backend/http-client":transport,"@/lib/backend/management-context-client":{managementCookieHeader:async()=>"padel_session=synthetic"},"@/lib/backend/contracts/tournament-workspaces":contracts},{process:{env:{VX4_BACKEND_ORIGIN:"http://backend.test"}},URLSearchParams});
 const result=await client.getTournamentOverview("event & another");assert.equal(calls[0][1],"/api/management/tournaments/workspace?view=overview&tournamentId=event+%26+another");assert.equal(calls[0][3].cookie,"padel_session=synthetic");assert.equal(result.tournament.createdAt.getTime(),raw.createdAt.getTime());assert.equal(result.tournament.updatedAt.getTime(),raw.updatedAt.getTime());assert.equal(result.tournament.firstBonusUntil.getTime(),raw.firstBonusUntil.getTime());assert.equal(result.tournament.publicRegistrations[0].createdAt.toISOString(),wire.tournament.publicRegistrations[0].createdAt);
 transport.readBackendContract=async()=>{throw Error("private database connection");};await assert.rejects(client.getTournamentOverview("event"),/^Error: Não foi possível consultar o evento\.$/);
});
