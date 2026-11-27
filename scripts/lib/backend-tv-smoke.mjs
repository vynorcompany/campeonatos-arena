import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
export async function assertTvSmoke(db,origin,frontendOrigin,staffId,sessionCookie){
 const arenas=[];
 try{
  for(const name of ['TV API own','Private foreign TV'])arenas.push(await db.arena.create({data:{name,slug:'tv-api-'+randomUUID(),createdById:'goal-test'}}));
  const[arena,foreign]=arenas;
  const member=await db.arenaMember.create({data:{arenaId:arena.id,userId:staffId,role:'STAFF',viewPermissions:['tv'],editPermissions:[]}});
  const cookie=sessionCookie.split(';')[0]+`; padel_arena=${arena.id}`;
  const read=(path,extra={})=>fetch(origin+path,{headers:{cookie,...extra},redirect:'manual'});
  const event=await db.tournament.create({data:{arenaId:arena.id,name:'TV API tournament',status:'PUBLISHED',priceFirstCents:10000}});
  await db.tournament.create({data:{arenaId:foreign.id,name:'Private foreign TV tournament',status:'PUBLISHED'}});
  await db.player.create({data:{arenaId:arena.id,name:'TV API athlete',email:'tv-private-profile@example.test',phone:'00000000000'}});
  const category=await db.tournamentCategory.create({data:{tournamentId:event.id,name:'TV API category',level:1}});
  const competition=await db.categoryCompetition.create({data:{categoryId:category.id,format:'SIMPLE',status:'PUBLISHED'}});
  const pairs=await Promise.all(['TV API home','TV API away'].map(name=>db.categoryPair.create({data:{competitionId:competition.id,name}})));
  const game=await db.categoryMatch.create({data:{competitionId:competition.id,label:'Final TV API',stage:'FINAL',roundOrder:1,homePairId:pairs[0].id,awayPairId:pairs[1].id,manualStatus:'LIVE',showOnTv:true}});
  await db.categoryMatch.create({data:{competitionId:competition.id,label:'Finished TV API',stage:'FINAL',roundOrder:2,homePairId:pairs[0].id,awayPairId:pairs[1].id,winnerPairId:pairs[0].id,manualStatus:'FINISHED',showOnTv:true}});
  const legacyPairs=await Promise.all(['Legacy TV home','Legacy TV away'].map(name=>db.pair.create({data:{tournamentId:event.id,name,totalPoints:0,drawOrder:1}})));
  const legacy=await db.match.create({data:{tournamentId:event.id,label:'Legacy TV API',stage:'FINAL',roundOrder:1,homePairId:legacyPairs[0].id,awayPairId:legacyPairs[1].id,manualStatus:'LIVE',showOnTv:true}});
  const manual=await db.manualUpcomingMatch.create({data:{arenaId:arena.id,displayOrder:1,homePairName:'Manual TV home',awayPairName:'Manual TV away',courtName:'Synthetic court',scheduledTime:'10:00',status:'SCHEDULED'}});
  await db.tvPresentationSettings.create({data:{arenaId:arena.id,tvMatchSource:'TOURNAMENT',tvSourceTournamentId:event.id,selectedTournamentId:event.id,showMonthlyPrize:true}});
  for(const query of ['view=settings&arenaId=foreign','view=settings&view=presentation','view=raw'])assert.equal((await read('/api/management/tv?'+query)).status,400);
  assert.equal((await read('/api/management/tv/pulse?arenaId=foreign')).status,400);
  const response=await read('/api/management/tv?view=settings');assert.equal(response.status,200,await response.clone().text());assert.equal(response.headers.get('cache-control'),'private, no-store');const data=await response.json();
  assert.deepEqual(data.payload.matches.map(row=>row.id).sort(),[`match-category-${game.id}`,`match-${legacy.id}`].sort());assert.ok(data.payload.matches.every(row=>row.status==='LIVE'));assert.equal(data.payload.settings.selectedTournamentName,event.name);assert.equal(data.payload.settings.showMonthlyPrize,true);assert.match(data.payload.settings.monthlyPrizeAmount,/100/);assert.deepEqual(data.manualMatches.map(row=>row.id),[manual.id]);assert.deepEqual(data.tournaments.map(row=>row.id),[event.id]);
  for(const hidden of ['Private foreign',foreign.id,'tv-private-profile@example.test','00000000000','passwordHash','encryptedToken'])assert.equal(JSON.stringify(data).includes(hidden),false,hidden);
  const compact=await(await read('/api/management/tv?view=presentation')).json();assert.equal(compact.manualMatches.length,0);assert.equal(compact.tournaments.length,0);assert.equal(compact.leagueCycles.length,0);assert.equal(compact.payload.matches.length,2);
  for(const path of ['/api/manual-upcoming-matches','/api/management/tv/pulse']){const first=await read(path);assert.equal(first.status,200);const etag=first.headers.get('etag');assert.ok(etag);assert.equal((await first.json()).matches.length,2);const unchanged=await read(path,{'if-none-match':etag});assert.equal(unchanged.status,304);assert.equal(await unchanged.text(),'');}
  for(const path of ['/proximos-jogos/apresentacao','/proximos-jogos/tv']){const page=await fetch(frontendOrigin+path,{headers:{cookie},redirect:'manual'});assert.equal(page.status,200);const html=await page.text();assert.ok(html.includes('TV API'));assert.equal(html.includes('Private foreign'),false);}
  await db.arenaMember.update({where:{id:member.id},data:{viewPermissions:['calendar']}});assert.equal((await read('/api/management/tv?view=settings')).status,403);for(const path of ['/api/manual-upcoming-matches','/api/management/tv/pulse'])assert.equal((await read(path)).status,403);
  console.log('TV HTTP: scoped explicit DTOs, live legacy/category matches, RLS-scoped prize, management/TV SSR, private profile exclusion, cache ETag/304 and reauthorization passed.');
 }finally{await db.arena.deleteMany({where:{id:{in:arenas.map(row=>row.id)},slug:{startsWith:'tv-api-'}}});}
}
