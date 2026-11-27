import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import * as contracts from "../src/lib/backend/contracts/tournament-ranking-workspace";
import * as rankingPeriod from "../src/lib/ranking/period";
import * as generalFeed from "../src/lib/ranking/general-feed";
function load(file:string,dependencies:Record<string,unknown>,extra:Record<string,unknown>={}){
 const exports:Record<string,Function>={};vm.runInNewContext(ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,...extra,require(name:string){if(name==="server-only")return{};assert.ok(name in dependencies,name);return dependencies[name];}});return exports;
}
test("ranking query rejects caller authority and duplicate-shaped identifiers",()=>{
 assert.equal(contracts.tournamentRankingQuerySchema.safeParse({rankingId:"own",period:"custom",start:"invalid"}).success,true);
 for(const query of [{rankingId:""},{rankingId:["a","b"]},{rankingId:"x".repeat(101)},{rankingId:"own",arenaId:"foreign"},{rankingId:"own",userId:"foreign"}])assert.equal(contracts.tournamentRankingQuerySchema.safeParse(query).success,false);
 const route=readFileSync("src/app/api/management/tournaments/ranking/route.ts","utf8");assert.match(route,/requireArenaAccess/);assert.match(route,/canViewModule\("tournaments"/);assert.match(route,/getAll\(key\)\.length !== 1/);assert.match(route,/private, no-store/);assert.doesNotMatch(route,/error\.message/);
});
test("ranking workspace derives arena, locks across every period and omits private source fields",async()=>{
 let allowed=true,exists=true,end:Date|null=new Date("2035-02-01T03:00:00Z");const calls:any[]=[];const start=new Date("2035-01-01T03:00:00Z");
 const source=()=>({id:"ranking",name:"Ranking",description:"Description",type:"PAIR",model:"LEAGUE",isGeneral:false,feedsGeneralRanking:true,arenaId:"private-arena",rules:[{id:"private-rule",stageKey:"CHAMPION",points:100,displayOrder:1}],tournaments:[{id:"event",name:"Event",status:"FINISHED",createdAt:start}],cycles:[{id:"cycle",label:"January",isCurrent:true,startedAt:start,endedAt:null}],selectedCycleId:"cycle",period:{mode:"custom",label:"January",start,endExclusive:end,query:{period:"custom",start:"2035-01-01",end:"2035-01-31"},error:null},leaderboard:[{playerId:"player",playerName:"One",points:10,tournamentsPlayed:2,lastTournamentName:"Event",privateCpf:"private-cpf"}],pairLeaderboard:[{pairKey:"one:two",pairName:"One / Two",points:100,competitionsPlayed:1,lastTournamentName:"Event",players:[{phone:"private-phone"}]}],_count:{tournaments:4},linkedPlayers:2});
 const service=load("src/lib/backend/services/tournament-ranking-workspace.ts",{
 "@/lib/auth/guards":{requireModuleView:async(module:string)=>{assert.equal(module,"tournaments");if(!allowed)throw Error("denied");return{arenaId:"own"};}},
 "@/lib/arena-database":{arenaDatabase:(arena:string)=>{assert.equal(arena,"own");return{categoryCompetition:{findMany:async(args:any)=>{calls.push(args);return args.select.status&&!args.select.id?[{status:"DRAFT"},{status:"FINISHED"}]:[{id:"competition",status:"PUBLISHED",format:"LEAGUE",category:{name:"Class A",tournament:{id:"event",name:"Event"}}}];}}};}},
 "@/lib/services/ranking":{getRankingProfileLeaderboard:async(arena:string,id:string,period:any)=>{assert.equal(arena,"own");assert.equal(id,"ranking");assert.equal(period.period,"custom");return exists?source():null;}},
 "../contracts/tournament-ranking-workspace":contracts,
 });
 const result=await service.resolveTournamentRankingWorkspace({rankingId:"ranking",period:"custom"});assert.equal(result.formatLocked,true);assert.equal(result.ranking.pairLeaderboard[0].points,100);assert.equal(result.ranking.leaderboard[0].lastTournamentName,"Event");assert.equal(result.categoryCompetitions[0].category.tournament.id,"event");
 assert.equal(calls[0].where.category.tournament.createdAt,undefined);assert.equal(calls[0].where.rankingId,"ranking");assert.equal(calls[0].where.category.tournament.arenaId,"own");assert.equal(calls[1].where.category.tournament.arenaId,"own");assert.equal(calls[1].where.category.tournament.createdAt.gte,start);assert.equal(calls[1].where.category.tournament.createdAt.lt,end);assert.equal(calls[1].orderBy.createdAt,"desc");
 for(const privateValue of ["private-arena","private-rule","private-cpf","private-phone","startedAt","createdAt","endExclusive","linkedPlayers"])assert.equal(JSON.stringify(result).includes(privateValue),false,privateValue);
 assert.equal(contracts.tournamentRankingWorkspaceSchema.safeParse({...result,ranking:{...result.ranking,arenaId:"private"}}).success,false);
 end=null;calls.length=0;await service.resolveTournamentRankingWorkspace({rankingId:"ranking",period:"custom"});assert.equal("lt" in calls[1].where.category.tournament.createdAt,false);
 exists=false;calls.length=0;const missing=await service.resolveTournamentRankingWorkspace({rankingId:"ranking",period:"custom"});assert.equal(missing.ranking,null);assert.equal(missing.categoryCompetitions.length,0);assert.equal(calls.length,0);
 allowed=false;await assert.rejects(service.resolveTournamentRankingWorkspace({rankingId:"ranking",period:"custom"}),/denied/);assert.equal(calls.length,0);
 const page=readFileSync("src/app/(app)/torneios/rankings/[rankingId]/page.tsx","utf8");assert.doesNotMatch(page,/@prisma|lib\/prisma|arenaDatabase|lib\/services\/ranking|backend\/services/);assert.match(page,/if \(!ranking\) notFound\(\)/);
});
test("ranking client forwards only requested period/session and sanitizes awaited failures",async()=>{
 const calls:any[]=[];const transport={readBackendContract:async(...args:any[])=>{calls.push(args);return{ranking:null,formatLocked:false,categoryCompetitions:[]};}};
 const client=load("src/lib/tournaments/ranking-workspace.ts",{"@/lib/backend/http-client":transport,"@/lib/backend/management-context-client":{managementCookieHeader:async()=>"padel_session=synthetic"},"@/lib/backend/contracts/tournament-ranking-workspace":contracts},{process:{env:{VX4_BACKEND_ORIGIN:"http://backend.test"}},URLSearchParams});
 await client.getTournamentRankingWorkspace("rank & one",{period:"cycle",cycleId:"cycle"});assert.equal(calls[0][1],"/api/management/tournaments/ranking?rankingId=rank+%26+one&period=cycle&cycleId=cycle");assert.equal(calls[0][3].cookie,"padel_session=synthetic");
 transport.readBackendContract=async()=>{throw Error("private connection");};await assert.rejects(client.getTournamentRankingWorkspace("rank"),/^Error: Não foi possível consultar o ranking\.$/);
});

test("ranking sources reject malformed athlete ownership in individual, pair and general feeds",async()=>{
 const queries:any[]=[];
 const db={rankingProfile:{findFirst:async()=>({id:"ranking",name:"General",description:"",type:"INDIVIDUAL",model:"KNOCKOUT",isGeneral:true,feedsGeneralRanking:false,createdAt:new Date(),rules:[],cycles:[],tournaments:[],_count:{tournaments:0}})},tournamentPlayer:{findMany:async(args:any)=>{queries.push(["individual",args]);return[];}},categoryPair:{findMany:async(args:any)=>{queries.push(["pair",args]);return[];}}};
 const service=load("src/lib/services/ranking.ts",{"@/lib/arena-database":{arenaDatabase:(arena:string)=>{assert.equal(arena,"own");return db;}},"@/lib/ranking/period":rankingPeriod,"@/lib/ranking/general-feed":generalFeed});
 await service.getRankingProfileLeaderboard("own","ranking",{period:"year"});assert.equal(queries.length,3);
 for(const [kind,query] of queries){if(kind==="individual"){assert.equal(query.where.player.arenaId,"own");assert.equal(query.where.tournament.arenaId,"own");}else{assert.equal(query.where.players.every.player.arenaId,"own");assert.equal(query.where.competition.category.tournament.arenaId,"own");}}
});
