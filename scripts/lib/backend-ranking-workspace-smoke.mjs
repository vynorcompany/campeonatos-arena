import assert from 'node:assert/strict';
import {createAgencyPagesFixture,cleanupAgencyPagesFixture} from './backend-agency-pages-smoke.mjs';
/** @param {import('@prisma/client').PrismaClient} db */
export async function assertRankingWorkspaceSmoke(db,origin,frontendOrigin){
 const f=await createAgencyPagesFixture(db),arenaId=f.arenas[0].id,foreignArenaId=f.arenas[1].id;
 const get=(query,cookie=f.viewer.cookie)=>fetch(`${origin}/api/management/tournaments/ranking?${query}`,{headers:cookie?{cookie}:{},redirect:'manual'});
 const read=async(query)=>{const response=await get(query);assert.equal(response.status,200,await response.clone().text());assert.equal(response.headers.get('cache-control'),'private, no-store');return response.json();};
 try{
  await db.arenaMember.update({where:{userId_arenaId:{userId:f.users[1].id,arenaId}},data:{role:'STAFF',viewPermissions:[],editPermissions:[]}});
  assert.equal((await get('rankingId=own')).status,403);assert.equal((await get('rankingId=own','')).status,307);
  await db.arenaMember.update({where:{userId_arenaId:{userId:f.users[1].id,arenaId}},data:{viewPermissions:['tournaments']}});
  for(const query of ['', 'rankingId=a&rankingId=b','rankingId=a&arenaId=foreign','rankingId='+ 'x'.repeat(101)])assert.equal((await get(query)).status,400);
  const makeRanking=(owner,name,type,model)=>db.rankingProfile.create({data:{arenaId:owner,name,type,model,description:'Descrição ranking API',rules:{create:{stageKey:'CHAMPION',label:'Campeão',points:100,displayOrder:1}},cycles:{create:{label:'Janeiro API',startedAt:new Date('2035-01-01T03:00:00Z'),endedAt:new Date('2035-01-31T23:00:00Z')}}}});
  const individual=await makeRanking(arenaId,'Individual consulta API','INDIVIDUAL','KNOCKOUT'),pairRanking=await makeRanking(arenaId,'Duplas consulta API','PAIR','LEAGUE'),foreign=await makeRanking(foreignArenaId,'private-foreign-ranking','PAIR','LEAGUE');
  const player=await db.player.create({data:{arenaId,name:'Atleta ranking API',phone:'42999996601',cpf:'private-player-cpf',email:'private-player@example.test'}});
  const second=await db.player.create({data:{arenaId,name:'Segundo ranking API'}}),foreignPlayer=await db.player.create({data:{arenaId:foreignArenaId,name:'private-foreign-ranking-player'}});
  const legacy=await db.tournament.create({data:{arenaId,name:'Evento individual ranking API',rankingId:individual.id,status:'FINISHED',createdAt:new Date('2035-01-02T12:00:00Z'),entries:{create:[{playerId:player.id,seedPoints:0,tournamentPoints:40},{playerId:foreignPlayer.id,seedPoints:0,tournamentPoints:999}]}}});
  const events=[];
  for(const [name,date,status] of [['Dentro ranking API','2035-01-03T12:00:00Z','FINISHED'],['Anterior ranking API','2034-12-31T12:00:00Z','PUBLISHED'],['Posterior ranking API','2035-02-01T03:00:00Z','PUBLISHED']]){
   const event=await db.tournament.create({data:{arenaId,name,createdAt:new Date(date),categories:{create:{name:'Categoria ranking API',level:1,competition:{create:{format:'LEAGUE',status,rankingId:pairRanking.id}}}}}});events.push(event);
  }
  const competition=await db.categoryCompetition.findFirstOrThrow({where:{category:{tournamentId:events[0].id}}});
  await db.categoryRankingApplication.create({data:{competitionId:competition.id,rankingId:pairRanking.id,feedsGeneralRanking:false}});
  /** @type {[string,string[],number][]} */
  const teams=[['Dupla ranking API',[player.id,second.id],100],['private-invalid-ranking-team',[player.id,foreignPlayer.id],999]];
  for(const [name,playerIds,points] of teams){
   // The invalid legacy roster uses a distinct own player to preserve the competition's unique-athlete constraint.
   const ids=name==='Dupla ranking API'?playerIds:[(await db.player.create({data:{arenaId,name:'Vínculo legado ranking API'}})).id,foreignPlayer.id];
   const pair=await db.categoryPair.create({data:{competitionId:competition.id,name,totalPoints:points}});
   for(const [index,playerId] of ids.entries())await db.categoryPairPlayer.create({data:{pairId:pair.id,competitionId:competition.id,playerId,slot:index+1}});
  }
  const query=`rankingId=${pairRanking.id}&period=custom&start=2035-01-01&end=2035-01-31`,pair=await read(query);
  assert.equal(pair.formatLocked,true);assert.equal(pair.categoryCompetitions.length,1);assert.equal(pair.categoryCompetitions[0].category.tournament.id,events[0].id);assert.equal(pair.ranking.pairLeaderboard.length,1);assert.equal(pair.ranking.pairLeaderboard[0].points,100);assert.equal(pair.ranking.pairLeaderboard[0].pairName,'Atleta ranking API / Segundo ranking API');assert.equal(pair.ranking.tournaments.length,1);
  const single=await read(`rankingId=${individual.id}&period=custom&start=2035-01-01&end=2035-01-31`);assert.equal(single.formatLocked,false);assert.equal(single.ranking.leaderboard.length,1);assert.equal(single.ranking.leaderboard[0].points,40);assert.equal(single.ranking.leaderboard[0].lastTournamentName,legacy.name);
  const outside=await read(`rankingId=${pairRanking.id}&period=custom&start=2036-01-01&end=2036-01-31`);assert.equal(outside.categoryCompetitions.length,0);assert.equal(outside.formatLocked,true);assert.equal(outside.ranking.pairLeaderboard.length,0);
  const cycle=await db.rankingCycle.findFirstOrThrow({where:{rankingId:pairRanking.id}});const byCycle=await read(`rankingId=${pairRanking.id}&period=cycle&cycleId=${cycle.id}`);assert.equal(byCycle.ranking.selectedCycleId,cycle.id);assert.equal(byCycle.ranking.pairLeaderboard[0].points,100);
  const invalidPeriod=await read(`rankingId=${pairRanking.id}&period=custom&start=invalid&end=invalid`);assert.ok(invalidPeriod.ranking.period.error);
  assert.deepEqual(await read(`rankingId=${foreign.id}`),{ranking:null,formatLocked:false,categoryCompetitions:[]});
  for(const data of [pair,single,byCycle])for(const marker of ['private-foreign','private-invalid','private-player','photoUrl','createdAt','startedAt','arenaId','playerPhotoUrl'])assert.equal(JSON.stringify(data).includes(marker),false,marker);
  for(const [id,tab,expected] of [[pairRanking.id,'configuracao','Duplas consulta API'],[pairRanking.id,'pontuacao','100'],[pairRanking.id,'classificacao','Atleta ranking API / Segundo ranking API'],[pairRanking.id,'uso','Dentro ranking API'],[individual.id,'classificacao','Atleta ranking API']]){
   const response=await fetch(`${frontendOrigin}/torneios/rankings/${id}?tab=${tab}&period=custom&start=2035-01-01&end=2035-01-31`,{headers:{cookie:f.viewer.cookie},redirect:'manual'});assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes(expected),tab);for(const marker of ['private-foreign','private-invalid','private-player'])assert.equal(html.includes(marker),false,tab+marker);
  }
  assert.equal(await db.agencyInvoice.count({where:{arenaId:{in:f.arenas.map(row=>row.id)}}}),3);assert.equal(await db.financialEntry.count({where:{arenaId:{in:f.arenas.map(row=>row.id)}}}),0);assert.equal((await db.tournamentPlayer.findUniqueOrThrow({where:{tournamentId_playerId:{tournamentId:legacy.id,playerId:player.id}}})).tournamentPoints,40);assert.equal((await db.categoryPair.findFirstOrThrow({where:{competitionId:competition.id,name:'Dupla ranking API'}})).totalPoints,100);assert.equal((await db.categoryPair.findFirstOrThrow({where:{competitionId:competition.id,name:'private-invalid-ranking-team'}})).totalPoints,999);assert.equal((await db.tournamentPlayer.findUniqueOrThrow({where:{tournamentId_playerId:{tournamentId:legacy.id,playerId:foreignPlayer.id}}})).tournamentPoints,999);
  console.log('Ranking workspace HTTP: view-only permission, strict scope, Individual/Pair points, all-period format lock, inclusive date/end-exclusive bounds, named cycles, invalid-period feedback, malformed foreign-roster exclusion, minimal DTOs and four SSR tabs preserved without resetting points.');
 }finally{
  const ids=f.arenas.map(row=>row.id);assert.equal(await db.arena.count({where:{id:{in:ids},createdById:'goal-test',slug:{startsWith:'agency-pages-api-'}}}),ids.length);
  await db.categoryPairPlayer.deleteMany({where:{pair:{competition:{category:{tournament:{arenaId:{in:ids}}}}}}});await cleanupAgencyPagesFixture(db,f);
 }
}
