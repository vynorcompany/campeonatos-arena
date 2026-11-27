import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { tournamentWorkspaceQuerySchema, tournamentCategoriesSchema, tournamentGamesSchema } from "../src/lib/backend/contracts/tournament-workspaces";
function load(file:string,dependencies:Record<string,unknown>,extra:Record<string,unknown>={}) {
 const exports:Record<string,Function>={};
 vm.runInNewContext(ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,...extra,require(name:string){if(name==="server-only")return{};assert.ok(name in dependencies,name);return dependencies[name];}});
 return exports;
}
test("internal event contracts reject forged authority, duplicate-shaped filters and private fields",()=>{
 for(const query of [{view:"games",tournamentId:"own",arenaId:"foreign"},{view:"games",tournamentId:["a","b"]},{view:"private",tournamentId:"own"},{view:"categories",tournamentId:"x".repeat(101)}]) assert.equal(tournamentWorkspaceQuerySchema.safeParse(query).success,false);
 assert.equal(tournamentWorkspaceQuerySchema.safeParse({view:"categories",tournamentId:"own"}).success,true);
 assert.equal(tournamentCategoriesSchema.safeParse({view:"categories",tournament:null,categories:[],registrationPhone:"private"}).success,false);
 assert.equal(tournamentGamesSchema.safeParse({view:"games",tournament:{id:"own",name:"Event",description:"private"},courts:[],matches:[]}).success,false);
});
test("internal event services require management before reading and scope categories, counts, courts and games",async()=>{
 let manage=true,exists=true;const calls:any[]=[];
 const db={tournament:{findFirst:async(args:any)=>{calls.push(["event",args]);return !exists?null:args.select.categories?{id:"event",name:"Event",categories:[{id:"category",name:"Individual",registrationType:"INDIVIDUAL",_count:{registrations:7},competition:null},{id:"trio",name:"Trio",registrationType:"PAIR",_count:{registrations:5},competition:{format:"TRIO",_count:{pairs:3}}}]}:{id:"event",name:"Event"};}},court:{findMany:async(args:any)=>{calls.push(["court",args]);return[{name:"Court"}];}},categoryMatch:{findMany:async(args:any)=>{calls.push(["match",args]);return[{id:"match",label:"Final",scheduledDate:null,scheduledTime:null,courtName:null,competition:{category:{name:"Trio"}},homePair:{name:"Team A"},awayPair:null}];}}};
 const service=load("src/lib/backend/services/tournament-workspaces.ts",{
 "@/lib/auth/guards":{requireModuleView:async(module:string)=>{assert.equal(module,"tournaments");return{arenaId:"own"};}},
 "@/lib/permissions":{canPerformPermission:(permission:string)=>{assert.equal(permission,"tournaments:manage");return manage;}},
 "@/lib/arena-database":{arenaDatabase:(arena:string)=>{assert.equal(arena,"own");return db;}},
 "../contracts/tournament-workspaces":{tournamentCategoriesSchema,tournamentGamesSchema},
 });
 const categories=await service.resolveTournamentCategories("event");assert.equal(categories.categories[0].registrationCount,7);assert.equal(categories.categories[1].competition.pairCount,3);assert.equal(calls[0][1].where.arenaId,"own");assert.equal(calls[0][1].where.id,"event");assert.equal(calls[0][1].select.categories.where.archivedAt,null);assert.equal(calls[0][1].select.categories.orderBy.level,"asc");assert.equal(calls[0][1].select.categories.select.competition.select._count.select.pairs.where.active,true);
 calls.length=0;const games=await service.resolveTournamentGames("event");assert.equal(games.matches[0].homePair.name,"Team A");const court=calls.find(c=>c[0]==="court")[1],match=calls.find(c=>c[0]==="match")[1];assert.equal(court.where.arenaId,"own");assert.equal(court.where.active,true);assert.equal(match.where.competition.category.tournamentId,"event");assert.equal(match.where.competition.category.tournament.arenaId,"own");assert.equal(match.orderBy.roundOrder,"asc");assert.equal(match.select.woReason,undefined);assert.equal(match.select.homeScore,undefined);
 exists=false;const missing=await service.resolveTournamentGames("foreign");assert.equal(missing.tournament,null);assert.equal(missing.courts.length,0);assert.equal(missing.matches.length,0);assert.equal((await service.resolveTournamentCategories("foreign")).categories.length,0);
 manage=false;calls.length=0;await assert.rejects(service.resolveTournamentCategories("event"),/Sem permissão/);await assert.rejects(service.resolveTournamentGames("event"),/Sem permissão/);assert.equal(calls.length,0);
 for(const area of ["categorias","jogos"]){const page=readFileSync(`src/app/(app)/torneios/[tournamentId]/${area}/page.tsx`,"utf8");assert.doesNotMatch(page,/@prisma|lib\/prisma|arenaDatabase|backend\/services/);assert.match(page,/if \(!tournament\) notFound\(\)/);assert.match(page,/tournaments:manage/);}
});
test("internal event frontend forwards only session, view and event id, sanitizing rejected transport",async()=>{
 const calls:any[]=[];const transport={readBackendContract:async(...args:unknown[])=>{calls.push(args);return{};}};
 const client=load("src/lib/tournaments/workspaces.ts",{"@/lib/backend/http-client":transport,"@/lib/backend/management-context-client":{managementCookieHeader:async()=>"padel_session=synthetic"},"@/lib/backend/contracts/tournament-workspaces":{tournamentWorkspaceQuerySchema,tournamentCategoriesSchema,tournamentGamesSchema}},{process:{env:{VX4_BACKEND_ORIGIN:"http://backend.test"}},URLSearchParams});
 await client.getTournamentCategories("event & another");await client.getTournamentGames("event");assert.equal(calls[0][1],"/api/management/tournaments/workspace?view=categories&tournamentId=event+%26+another");assert.equal(calls[1][1],"/api/management/tournaments/workspace?view=games&tournamentId=event");assert.equal(calls[0][3].cookie,"padel_session=synthetic");
 transport.readBackendContract=async()=>{throw Error("private database connection");};await assert.rejects(client.getTournamentCategories("event"),/^Error: Não foi possível consultar as categorias do evento\.$/);await assert.rejects(client.getTournamentGames("event"),/^Error: Não foi possível consultar os jogos do evento\.$/);
});
