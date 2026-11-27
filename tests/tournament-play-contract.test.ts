import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as contracts from "../src/lib/backend/contracts/tournament-play";
import * as permissions from "../src/lib/permissions";
import {allowedFrontendOrigin} from "../src/lib/backend/origin-policy";
function load(path:string,deps:Record<string,unknown>,extra:Record<string,unknown>={}){const exports:any={};vm.runInNewContext(ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,FormData,Error,...extra,require:(name:string)=>{if(name==="server-only")return{};assert.ok(name in deps,name);return deps[name];}});return exports;}
test("play payload retains repeated athletes and rejects duplicate scalars and caller authority",()=>{
 const form=new FormData();form.set("tournamentId","own");form.append("playerIds","one");form.append("playerIds","two");form.set("arenaId","forged");
 assert.deepEqual(contracts.tournamentPlayPayload("entries",form),{tournamentId:["own"],playerIds:["one","two"]});
 assert.equal(contracts.tournamentPlayInputSchema("entries").safeParse({arenaId:["forged"]}).success,false);
 assert.equal(contracts.tournamentPlayInputSchema("match-result").safeParse({matchId:["one","two"]}).success,false);
 assert.equal(contracts.tournamentPlayInputSchema("match-result").safeParse({playerIds:["one"]}).success,false);
 assert.equal(contracts.tournamentPlayInputSchema("entries").safeParse({playerIds:Array(1001).fill("one")}).success,false);
 assert.equal(contracts.tournamentPlayInputSchema("match-tv").safeParse({showOnTv:["x".repeat(201)]}).success,false);
 form.append("tournamentId","duplicate");assert.throws(()=>contracts.tournamentPlayPayload("entries",form));
 assert.equal(contracts.tournamentPlayOutcomeSchema.safeParse({state:null,refresh:true,paths:["https://foreign.invalid"]}).success,false);
 assert.equal(contracts.tournamentPlayOutcomeSchema.safeParse({state:null,refresh:true,paths:[],privateToken:"secret"}).success,false);
});
test("route preserves module and compound tournament permissions before invoking any write",async()=>{
 let auth:any={arenaRole:"STAFF",systemRole:"VIEWER",viewPermissions:["tournaments"],editPermissions:[]},calls=0;
 const route=load("src/app/api/management/tournaments/play/[operation]/route.ts",{"next/server":{NextResponse:{json:(body:any,options:any)=>({status:200,body,...options})}},"@/lib/backend/services/management-session":{requireArenaAccess:async()=>auth},"@/lib/permissions":permissions,"@/lib/backend/origin-policy":{allowedFrontendOrigin},"@/lib/http/json-body":{readBoundedJson:async(request:any)=>request.body,RequestBodyTooLargeError:class extends Error{}},"@/lib/backend/contracts/tournament-play":contracts,"@/lib/backend/services/tournament-play-mutations":{executeTournamentPlayMutation:async()=>{calls++;return{state:null,refresh:true,paths:[]};}}},{process:{env:{VX4_FRONTEND_ORIGINS:'["https://frontend.test"]'}}});
 const post=(operation:string,body:any={},origin="https://frontend.test")=>route.POST({headers:new Headers({origin}),body},{params:Promise.resolve({operation})});
 for(const operation of Object.keys(contracts.tournamentPlayFields))assert.equal((await post(operation)).status,403,operation);assert.equal(calls,0);
 for(const [edit,allowed] of [[['tournaments:results'],['match-result']],[['matches'],['match-result','match-court','match-schedule','match-participants','match-status','match-tv','matches-generate']],[['pairs'],['pairs-generate','pair-create','pair-update','pair-delete','pair-points']],[['groups'],['pair-group','groups-generate']],[['tournaments:manage'],['entry-points','entries']]] as const){
  auth.editPermissions=[...edit];for(const operation of Object.keys(contracts.tournamentPlayFields))assert.equal((await post(operation)).status,allowed.includes(operation as never)?200:403,`${edit}:${operation}`);
 }
 auth.editPermissions=['matches'];auth.viewPermissions=['matches'];assert.equal((await post('match-result')).status,403);assert.equal((await post('match-court')).status,403);
 auth.viewPermissions=['tournaments'];assert.equal((await post('match-court',{},'https://foreign.invalid')).status,403);assert.equal((await post('match-court',{arenaId:['forged']})).status,400);assert.equal((await post('match-court',{matchId:['a','b']})).status,400);assert.equal((await post('unknown')).status,404);
 const good=await post('match-court',{matchId:['own'],courtName:['Agecon']});assert.equal(good.headers['Cache-Control'],'private, no-store');
});
test("executor dispatches every operation, preserves repeated ids and cache effects, and hides infrastructure errors",async()=>{
 const calls:any[]=[];let failure:Error|null=null;
 const names={"entry-points":"updateTournamentEntryPointsAction",entries:"syncEntriesStateAction","pairs-generate":"generatePairsAction","pair-create":"createTournamentPairAction","pair-update":"updateTournamentPairAction","pair-delete":"deleteTournamentPairAction","pair-points":"updateTournamentPairPointsAction","pair-group":"moveTournamentPairGroupAction","groups-generate":"generateGroupsAction","matches-generate":"generateMatchesAction","match-court":"updateMatchCourtAction","match-schedule":"updateMatchScheduleAction","match-result":"updateMatchResultAction","match-participants":"updateMatchParticipantsAction","match-status":"updateMatchManualStatusAction","match-tv":"updateMatchTvVisibilityAction"};
 const actions:any={};for(const name of Object.values(names))actions[name]=async(...args:any[])=>{const form=args.find(value=>value instanceof FormData),effects=args.at(-1);assert.ok(form);calls.push({name,fields:[...form.entries()]});if(failure)throw failure;effects.refreshTournamentRoutes();if(name==='updateMatchTvVisibilityAction')effects.revalidatePath('/proximos-jogos/tv');return name==='createTournamentPairAction'||name==='syncEntriesStateAction'?{error:null,success:'Preserved'}:undefined;};
 const service=load("src/lib/backend/services/tournament-play-mutations.ts",{"./tournament-draw-actions":actions,"./tournament-matches-actions":actions,"../contracts/tournament-play":contracts});
 for(const [operation,name] of Object.entries(names)){const fields=operation==='entries'?{tournamentId:['own'],playerIds:['one','two']}:{};const outcome=await service.executeTournamentPlayMutation(operation,fields);assert.equal(calls.at(-1).name,name);assert.equal(outcome.refresh,true);assert.deepEqual(outcome.paths,operation==='match-tv'?['/proximos-jogos/tv']:[]);if(operation==='entries')assert.deepEqual(calls.at(-1).fields,[['tournamentId','own'],['playerIds','one'],['playerIds','two']]);}
 failure=new Error('Jogo não encontrado.');assert.equal((await service.executeTournamentPlayMutation('match-court',{})).state.error,'Jogo não encontrado.');
 failure=new Error('private database password');await assert.rejects(service.executeTournamentPlayMutation('match-court',{}),/private database password/);assert.doesNotMatch(service.tournamentPlayError(failure),/private/);
 const facade=readFileSync('src/lib/tournament/play-mutation.ts','utf8');assert.match(facade,/catch\{return\{error:uncertain/);assert.doesNotMatch(facade,/while|retry|setTimeout\(/);
 for(const file of ['draw','matches'])assert.doesNotMatch(readFileSync(`src/lib/actions/tournament/${file}.ts`,'utf8'),/prisma|backend\/services|lib\/services|lib\/auth/);
});
test("knockout participants must belong to the same tournament before any score reset",async()=>{
 let writes=0,accepted=['own-a','own-b'];const queries:any[]=[];
 const db={match:{findFirst:async(args:any)=>{assert.equal(args.where.tournament.arenaId,'own-arena');return{id:'match',tournamentId:'own-event',stage:'FINAL',homePairId:'own-a',awayPairId:'own-b'};},update:async()=>{writes++;}},pair:{findMany:async(args:any)=>{queries.push(args);assert.equal(args.where.tournamentId,'own-event');assert.equal(args.where.tournament.arenaId,'own-arena');return accepted.map(id=>({id}));}}};
 const service=load('src/lib/services/tournament/matches.ts',{'@/lib/prisma':{prisma:db},'@/lib/rls':{withArenaTransaction:async(arena:string,fn:Function)=>{assert.equal(arena,'own-arena');return fn(db);}},'@/lib/services/tournament-ranking':{recalculateTournamentRankingPointsTx:async()=>{}},'@/lib/services/tournament/shared':{matchStage:{GROUP:'GROUP'},clearFollowingMatches:async()=>{}}});
 accepted=['own-a'];await assert.rejects(service.updateKnockoutParticipants('match','own-arena','own-a','foreign'),/As duplas devem pertencer/);assert.equal(writes,0);
 accepted=['own-a'];await assert.rejects(service.updateKnockoutParticipants('match','own-arena','own-a','own-a'),/As duplas devem pertencer/);assert.equal(writes,0);
 accepted=['own-a','own-b'];await service.updateKnockoutParticipants('match','own-arena','own-a','own-b');assert.equal(writes,1);assert.deepEqual(JSON.parse(JSON.stringify(queries.at(-1).select)),{id:true});
});
test("frontend forwards only allowed fields and session, applies returned effects, and never repeats uncertain writes",async()=>{
 let calls=0,refreshes=0,broken=false;const paths:string[]=[];
 const client=load('src/lib/tournament/play-mutation.ts',{'next/headers':{headers:async()=>new Headers({origin:'https://frontend.test'})},'next/cache':{revalidatePath:(path:string)=>paths.push(path)},'./revalidation':{refreshTournamentRoutes:()=>{refreshes++;}},'@/lib/backend/management-context-client':{managementCookieHeader:async()=>'padel_session=synthetic; padel_arena=own'},'@/lib/backend/http-client':{backendOrigin:(origin:string)=>origin},'@/lib/backend/contracts/tournament-play':contracts},{process:{env:{VX4_BACKEND_ORIGIN:'https://backend.test'}},URL,AbortSignal,fetch:async(url:URL,options:any)=>{calls++;assert.equal(url.href,'https://backend.test/api/management/tournaments/play/match-tv');assert.equal(options.headers.cookie,'padel_session=synthetic; padel_arena=own');assert.equal(options.headers.origin,'https://frontend.test');assert.deepEqual(JSON.parse(options.body),{matchId:['own-match'],showOnTv:['on']});if(broken)throw Error('private transport detail');return{ok:true,json:async()=>({state:null,refresh:true,paths:['/proximos-jogos/tv']})};}});
 const form=new FormData();form.set('matchId','own-match');form.set('showOnTv','on');form.set('arenaId','forged');form.set('providerToken','private');
 assert.equal((await client.runTournamentPlayMutation('match-tv',form)).error,null);assert.equal(refreshes,1);assert.deepEqual(paths,['/proximos-jogos/tv']);
 broken=true;assert.match((await client.runTournamentPlayMutation('match-tv',form)).error,/Confira o evento/);assert.equal(calls,2);assert.equal(refreshes,1);
});
