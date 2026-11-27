import assert from 'node:assert/strict';
import {createAgencyPagesFixture,cleanupAgencyPagesFixture} from './backend-agency-pages-smoke.mjs';
/** Real domain writes only in owned disposable arenas. */
export async function assertTournamentPlaySmoke(db,origin,requestOrigin='http://127.0.0.1:3014'){
 const f=await createAgencyPagesFixture(db),arenaId=f.arenas[0].id,foreignArenaId=f.arenas[1].id;
 const write=(operation,fields={},cookie=f.viewer.cookie,originHeader=requestOrigin)=>fetch(`${origin}/api/management/tournaments/play/${operation}`,{method:'POST',headers:{...(cookie?{cookie}:{}),origin:originHeader,'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,Array.isArray(value)?value:[value]]))),redirect:'manual'});
 const apply=async(operation,fields)=>{const r=await write(operation,fields);assert.equal(r.status,200,await r.clone().text());assert.equal(r.headers.get('cache-control'),'private, no-store');const result=await r.json();assert.equal(result.state?.error??null,null,JSON.stringify(result));return result;};
 try{
  await db.arenaMember.update({where:{userId_arenaId:{userId:f.users[1].id,arenaId}},data:{role:'STAFF',viewPermissions:['tournaments'],editPermissions:[]}});
  assert.equal((await write('match-status',{},'')).status,307);assert.equal((await write('match-status')).status,403);
  await db.arenaMember.update({where:{userId_arenaId:{userId:f.users[1].id,arenaId}},data:{editPermissions:['tournaments:manage','tournaments:results','pairs','groups','matches']}});
  assert.equal((await write('match-status',{},f.viewer.cookie,'https://foreign.invalid')).status,403);assert.equal((await write('match-status',{arenaId})).status,400);assert.equal((await write('match-status',{matchId:['one','two']})).status,400);assert.equal((await write('unknown')).status,404);
  const event=await db.tournament.create({data:{arenaId,name:'Jogos API',groupCount:1,pairsPerGroup:2}}),other=await db.tournament.create({data:{arenaId,name:'Outro evento API'}}),foreign=await db.tournament.create({data:{arenaId:foreignArenaId,name:'private-foreign-play'}});
  const players=[];for(let i=0;i<4;i++)players.push(await db.player.create({data:{arenaId,name:`Atleta jogos API ${i}`,points:100+i}}));
  const outsider=await db.player.create({data:{arenaId:foreignArenaId,name:'private-foreign-play-athlete'}});
  await apply('entries',{tournamentId:event.id,playerIds:players.map(p=>p.id)});assert.equal(await db.tournamentPlayer.count({where:{tournamentId:event.id}}),4);
  const rejected=await write('entries',{tournamentId:event.id,playerIds:[players[0].id,outsider.id]});assert.equal(rejected.status,200);assert.ok((await rejected.json()).state.error);assert.equal(await db.tournamentPlayer.count({where:{tournamentId:event.id}}),4);
  const entry=await db.tournamentPlayer.findFirstOrThrow({where:{tournamentId:event.id,playerId:players[0].id}});await apply('entry-points',{entryId:entry.id,points:'777'});assert.equal((await db.tournamentPlayer.findUniqueOrThrow({where:{id:entry.id}})).seedPoints,777);
  await apply('pair-create',{tournamentId:event.id,playerAId:players[0].id,playerBId:players[1].id});let pair=await db.pair.findFirstOrThrow({where:{tournamentId:event.id}});
  await apply('pair-update',{pairId:pair.id,playerAId:players[0].id,playerBId:players[2].id});assert.equal(await db.pairPlayer.count({where:{pairId:pair.id,playerId:players[2].id}}),1);
  await apply('pair-points',{pairId:pair.id,totalPoints:'456'});assert.equal((await db.pair.findUniqueOrThrow({where:{id:pair.id}})).totalPoints,456);
  await apply('pair-delete',{pairId:pair.id});assert.equal(await db.pair.count({where:{tournamentId:event.id}}),0);
  await apply('pairs-generate',{tournamentId:event.id});assert.equal(await db.pair.count({where:{tournamentId:event.id}}),2);
  await apply('groups-generate',{tournamentId:event.id});const group=await db.tournamentGroup.findFirstOrThrow({where:{tournamentId:event.id}});pair=await db.pair.findFirstOrThrow({where:{tournamentId:event.id}});
  await apply('pair-group',{pairId:pair.id,targetGroupId:group.id});assert.equal((await db.pair.findUniqueOrThrow({where:{id:pair.id}})).groupId,group.id);
  await apply('matches-generate',{tournamentId:event.id});const match=await db.match.findFirstOrThrow({where:{tournamentId:event.id,stage:'GROUP'}});
  await apply('match-court',{matchId:match.id,courtName:'Agecon'});await apply('match-schedule',{matchId:match.id,scheduledTime:'19:30'});const tv=await apply('match-tv',{matchId:match.id,showOnTv:'on'});assert.deepEqual(tv.paths,['/proximos-jogos/tv']);
  await apply('match-status',{matchId:match.id,manualStatus:'LIVE'});let stored=await db.match.findUniqueOrThrow({where:{id:match.id}});assert.equal(stored.manualStatus,'LIVE');assert.equal(stored.courtName,'Agecon');assert.equal(stored.scheduledTime,'19:30');assert.equal(stored.showOnTv,true);
  await db.arenaMember.update({where:{userId_arenaId:{userId:f.users[1].id,arenaId}},data:{editPermissions:['tournaments:results']}});assert.equal((await write('match-schedule',{matchId:match.id,scheduledTime:'20:00'})).status,403);await apply('match-result',{matchId:match.id,homeScore:'2',awayScore:'1'});stored=await db.match.findUniqueOrThrow({where:{id:match.id}});assert.equal(stored.homeScore,2);assert.equal(stored.awayScore,1);assert.equal(stored.winnerPairId,stored.homePairId);
  await db.arenaMember.update({where:{userId_arenaId:{userId:f.users[1].id,arenaId}},data:{editPermissions:['matches']}});
  const pairs=await db.pair.findMany({where:{tournamentId:event.id},orderBy:{drawOrder:'asc'}}),otherPair=await db.pair.create({data:{tournamentId:other.id,name:'Other same-arena',totalPoints:0,drawOrder:1}}),foreignPair=await db.pair.create({data:{tournamentId:foreign.id,name:'private-foreign-play-pair',totalPoints:0,drawOrder:1}});
  const final=await db.match.create({data:{tournamentId:event.id,label:'Final contrato',stage:'FINAL',roundOrder:99,homePairId:pairs[0].id,awayPairId:pairs[1].id,homeScore:2,awayScore:0,winnerPairId:pairs[0].id}});
  for(const invalid of [otherPair.id,foreignPair.id]){const before=await db.match.findUniqueOrThrow({where:{id:final.id}}),r=await write('match-participants',{matchId:final.id,homePairId:pairs[0].id,awayPairId:invalid});assert.equal(r.status,200);assert.equal((await r.json()).state.error,'As duplas devem pertencer a este torneio.');assert.deepEqual(await db.match.findUniqueOrThrow({where:{id:final.id}}),before);}
  await apply('match-participants',{matchId:final.id,homePairId:pairs[1].id,awayPairId:pairs[0].id});const reordered=await db.match.findUniqueOrThrow({where:{id:final.id}});assert.equal(reordered.homePairId,pairs[1].id);assert.equal(reordered.homeScore,null);assert.equal(reordered.winnerPairId,null);
  const foreignMatch=await db.match.create({data:{tournamentId:foreign.id,label:'private-foreign-play-match',stage:'FINAL',roundOrder:1}});const denial=await write('match-status',{matchId:foreignMatch.id,manualStatus:'LIVE'});assert.equal(denial.status,200);assert.ok((await denial.json()).state.error);assert.equal((await db.match.findUniqueOrThrow({where:{id:foreignMatch.id}})).manualStatus,null);
  assert.equal(await db.financialEntry.count({where:{arenaId:{in:f.arenas.map(a=>a.id)}}}),0);assert.equal(await db.agencyInvoice.count({where:{arenaId:{in:f.arenas.map(a=>a.id)}}}),3);
  console.log('Tournament play HTTP: all sixteen operations, repeated-athlete synchronization, independent permissions, strict Origin/fields, same-event knockout validation before score reset, foreign arena rejection, cache effects and source financial preservation passed.');
 }finally{await cleanupAgencyPagesFixture(db,f);}
}
