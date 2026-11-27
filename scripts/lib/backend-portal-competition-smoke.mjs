import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
/** @param {import('@prisma/client').PrismaClient} db */
export async function createPortalCompetitionFixture(db){
 const createdIds=[];
 try{
 const arena=await db.arena.create({data:{name:'Portal Competition API',slug:'portal-competition-api-'+randomUUID(),createdById:'goal-test'}});createdIds.push(arena.id);
 const foreign=await db.arena.create({data:{name:'private-foreign-arena',slug:'portal-competition-api-'+randomUUID(),createdById:'goal-test'}});createdIds.push(foreign.id);
 const players=[];
 for(const[name,availability,gender,category]of [['Criador API','OFF','M','5ª'],['Parceiro API','AVAILABLE','M','5ª'],['Competidora API','LOOKING_FOR_PARTNER','F','6ª'],['Competidor API','OFF','M','5ª'],['Observador API','OFF','M','5ª']])players.push(await db.player.create({data:{arenaId:arena.id,name,phone:'4190000002'+players.length,email:'private-profile@example.test',bio:'private-athlete-bio',gender,class:category,padelCategories:JSON.stringify([category]),tournamentAvailability:availability}}));
 const foreignPlayer=await db.player.create({data:{arenaId:foreign.id,name:'private-foreign-player',phone:'41900000029',gender:'M',class:'5ª',tournamentAvailability:'AVAILABLE'}});
 await db.player.create({data:{arenaId:arena.id,name:'private-inactive-athlete',active:false,gender:'M',class:'5ª',tournamentAvailability:'AVAILABLE'}});
 const tokens=[];
 for(const player of [players[0],players[1],players[4],foreignPlayer]){const token=randomUUID()+randomUUID();const account=await db.playerAccount.create({data:{arenaId:player.arenaId,playerId:player.id,phone:player.phone,passwordHash:'private-account-password-hash'}});await db.playerSession.create({data:{playerAccountId:account.id,token:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+3600000)}});tokens.push(token);}
 await db.playerNotification.createMany({data:[{playerId:players[0].id,type:'DOUBLES_REQUEST',title:'Pedido API',message:'Vamos jogar',href:'/home'},{playerId:players[1].id,type:'DOUBLES_REQUEST',title:'private-other-notification',message:'Private',href:'/home'}]});
 const ranking=await db.rankingProfile.create({data:{arenaId:arena.id,name:'Ranking Geral API',type:'INDIVIDUAL',isGeneral:true,description:'private-ranking-description'}});
 const tournament=await db.tournament.create({data:{arenaId:arena.id,name:'Liga API',rules:'Regulamento público API'}});
 const category=await db.tournamentCategory.create({data:{tournamentId:tournament.id,name:'Classe API',level:5}});
 const competition=await db.categoryCompetition.create({data:{categoryId:category.id,format:'LEAGUE',status:'PUBLISHED',isPublic:true}});
 const pairs=[];for(let index=0;index<2;index++)pairs.push(await db.categoryPair.create({data:{competitionId:competition.id,name:index?'Dupla visitante API':'Dupla vencedora API',drawOrder:index+1,players:{create:[0,1].map(slot=>({playerId:players[index*2+slot].id,slot:slot+1}))}}}));
 const match=await db.categoryMatch.create({data:{competitionId:competition.id,label:'Jogo público API',stage:'GROUP',roundOrder:1,homePairId:pairs[0].id,awayPairId:pairs[1].id,winnerPairId:pairs[0].id,homeScore:6,awayScore:4,homeSet1:6,awaySet1:4,scheduledDate:'2035-01-10',scheduledTime:'10:00'}});
 const foreignSuper12=await db.super12Event.create({data:{arenaId:foreign.id,creatorId:foreignPlayer.id,name:'private-foreign-super12'}});
 const foreignMatch=await db.super12Match.create({data:{eventId:foreignSuper12.id,roundOrder:1}});
 const foreignTournament=await db.tournament.create({data:{arenaId:foreign.id,name:'private-foreign-tournament',rules:'private-foreign-rules'}});
 const foreignCategory=await db.tournamentCategory.create({data:{tournamentId:foreignTournament.id,name:'private-foreign-category',level:5}});
 await db.categoryCompetition.create({data:{categoryId:foreignCategory.id,format:'LEAGUE',status:'PUBLISHED',isPublic:true}});
 return {arena,foreign,players,foreignPlayer,ranking,tournament,category,competition,match,foreignSuper12,foreignMatch,tokens,cookie:`arena_player_session=${tokens[0]}`,participantCookie:`arena_player_session=${tokens[1]}`,spectatorCookie:`arena_player_session=${tokens[2]}`,foreignCookie:`arena_player_session=${tokens[3]}`};
 }catch(error){await cleanupCompetitionArenas(db,createdIds);throw error;}
}
/** @param {import('@prisma/client').PrismaClient} db @param {string[]} ids */
async function cleanupCompetitionArenas(db,ids){
 if(!ids.length)return;
 const arenas=await db.arena.findMany({where:{id:{in:ids}},select:{slug:true,createdById:true}});assert.equal(arenas.length,ids.length);assert.ok(arenas.every(row=>row.slug.startsWith('portal-competition-api-')&&row.createdById==='goal-test'));
 await db.super12Event.deleteMany({where:{arenaId:{in:ids}}});await db.tournament.deleteMany({where:{arenaId:{in:ids}}});await db.arena.deleteMany({where:{id:{in:ids},slug:{startsWith:'portal-competition-api-'},createdById:'goal-test'}});
}
/** @param {import('@prisma/client').PrismaClient} db @param {Awaited<ReturnType<typeof createPortalCompetitionFixture>>} fixture */
export async function cleanupPortalCompetitionFixture(db,fixture){await cleanupCompetitionArenas(db,[fixture.arena.id,fixture.foreign.id]);}
/** @param {import('@prisma/client').PrismaClient} db */
export async function assertPortalCompetitionSmoke(db,origin,frontendOrigin){
 const f=await createPortalCompetitionFixture(db);const {arena,players,foreign,foreignPlayer,cookie}=f;
 const get=(view,extra='',requestCookie=cookie,slug=arena.slug)=>fetch(`${origin}/api/portal/competition/${view}?arenaSlug=${slug}${extra}`,{headers:requestCookie?{cookie:requestCookie}:{},redirect:'manual'});
 const post=(operation,fields,requestCookie=cookie,requestOrigin=frontendOrigin)=>fetch(`${origin}/api/portal/super12/${operation}`,{method:'POST',headers:{'content-type':'application/json',origin:requestOrigin,...(requestCookie?{cookie:requestCookie}:{})},body:JSON.stringify({fields:Object.fromEntries(Object.entries({arenaSlug:arena.slug,...fields}).map(([key,value])=>[key,Array.isArray(value)?value:[value]]))}),redirect:'manual'});
 const success=async response=>{assert.equal(response.status,200,await response.clone().text());const value=await response.json();assert.equal(value.error,null);return value;};
 const rejection=async response=>{assert.equal(response.status,200,await response.clone().text());const value=await response.json();assert.equal(typeof value.error,'string');return value.error;};
 try{
  const shell=await get('shell','','');assert.equal(shell.status,200);const brand=await shell.json();assert.equal(brand.name,arena.name);assert.equal('id'in brand,false);assert.equal('createdById'in brand,false);
  for(const view of ['standings','radar','super12']){assert.equal((await get(view,'','')).status,401);assert.equal((await get(view,'',cookie,foreign.slug)).status,401);for(const key of ['playerId','arenaId','currentPlayerId'])assert.equal((await get(view,'&'+key+'=foreign')).status,400);assert.equal((await get(view,'&arenaSlug='+arena.slug)).status,400);}
  const generalResponse=await get('standings');assert.equal(generalResponse.status,200,await generalResponse.clone().text());const general=await generalResponse.json();assert.equal(general.selected.kind,'GENERAL_RANKING');assert.equal(general.selected.rankingName,'Ranking Geral API');assert.equal(JSON.stringify(general).includes('private-'),false);
  const standingsResponse=await get('standings','&view=category:'+f.category.id+'&tab=games');assert.equal(standingsResponse.status,200,await standingsResponse.clone().text());const standings=await standingsResponse.json();assert.equal(standings.selected.leagueStandings[0].pairName,'Dupla vencedora API');assert.equal(standings.selected.leagueStandings[0].victories,1);assert.equal(standings.selected.leagueStandings[0].differential,2);assert.equal(standings.games[0].games[0].finalScore.homeScore,6);assert.equal(standings.games[0].games[0].setScores[0].awayScore,4);assert.equal(standings.leagueRules[0].rules,'Regulamento público API');assert.equal('id'in standings.arena,false);assert.equal(JSON.stringify(standings).includes('private-'),false);
  const radar=await(await get('radar')).json();assert.deepEqual(radar.athletes.map(p=>p.name).sort(),['Competidora API','Parceiro API']);assert.deepEqual(radar.notifications.map(n=>n.title),['Pedido API']);assert.equal(JSON.stringify(radar).includes('private-'),false);
  const filtered=await(await get('radar','&gender=F&category='+encodeURIComponent('6ª')+'&athleteId='+players[2].id)).json();assert.equal(filtered.athletes.length,1);assert.equal(filtered.selectedAthlete.id,players[2].id);assert.equal((await(await get('radar','&athleteId='+foreignPlayer.id)).json()).selectedAthlete,null);
  for(const operation of ['create','score','advance','finish']){assert.equal((await post(operation,{},'')).status,401);assert.equal((await post(operation,{},cookie,'https://untrusted.invalid')).status,403);assert.equal((await post(operation,{creatorId:foreignPlayer.id})).status,400);assert.equal((await post(operation,{arenaSlug:[arena.slug,foreign.slug]})).status,400);}
  await rejection(await post('score',{matchId:f.foreignMatch.id,homeScore:'6',awayScore:'4'}));await rejection(await post('finish',{eventId:f.foreignSuper12.id}));assert.equal((await db.super12Match.findUniqueOrThrow({where:{id:f.foreignMatch.id}})).homeScore,null);assert.equal((await(await get('super12','&eventId='+f.foreignSuper12.id)).json()).selectedEvent,null);
  const pairIds=[[players[0].id,players[1].id],[players[2].id,players[3].id]],create={name:'Rodada API',format:'ROUND_ROBIN',groupCount:'1',knockoutQualification:'TOP_TWO',pairs:JSON.stringify(pairIds)};
  assert.match(await rejection(await post('create',{...create,pairs:JSON.stringify([[players[0].id,players[1].id],[players[0].id,players[3].id]])})),/duas duplas/);assert.match(await rejection(await post('create',{...create,pairs:JSON.stringify([[players[0].id,foreignPlayer.id],[players[2].id,players[3].id]])})),/não está mais disponível/);
  const created=await success(await post('create',create));const eventId=created.eventId;assert.ok(eventId);assert.equal(await db.playerNotification.count({where:{player:{arenaId:arena.id},type:'SUPER12'}}),3);
  const read=await get('super12','&eventId='+eventId);assert.equal(read.status,200,await read.clone().text());const board=await read.json();assert.equal(board.selectedEvent.isCreator,true);assert.equal(board.selectedEvent.groups[0].pairs.length,2);for(const key of ['arenaId','creatorId','knockoutState','createdAt'])assert.equal(key in board.selectedEvent,false);assert.equal(JSON.stringify(board).includes('private-'),false);
  assert.equal((await(await get('super12','&eventId='+eventId,f.participantCookie)).json()).selectedEvent.isCreator,false);assert.equal((await(await get('super12','&eventId='+eventId,f.spectatorCookie)).json()).selectedEvent,null);
  const game=board.selectedEvent.groups[0].matches[0];assert.match(await rejection(await post('score',{matchId:game.id,homeScore:'6',awayScore:'4'},f.participantCookie)),/Somente quem criou/);assert.equal((await db.super12Match.findUniqueOrThrow({where:{id:game.id}})).homeScore,null);
  await success(await post('score',{matchId:game.id,homeScore:'6',awayScore:'4'}));const scored=await(await get('super12','&eventId='+eventId)).json();assert.equal(scored.selectedEvent.standings[0].rows[0].wins,1);assert.equal(scored.selectedEvent.standings[0].rows[0].pointsFor-scored.selectedEvent.standings[0].rows[0].pointsAgainst,2);
  await rejection(await post('finish',{eventId},f.participantCookie));await success(await post('finish',{eventId}));await rejection(await post('score',{matchId:game.id,homeScore:'9',awayScore:'1'}));assert.equal((await db.super12Match.findUniqueOrThrow({where:{id:game.id}})).homeScore,6);assert.equal((await(await get('super12','&eventId='+eventId)).json()).selectedEvent.status,'FINISHED');
  const groupPlayers=players.slice(0,4);for(let index=4;index<16;index++)groupPlayers.push(await db.player.create({data:{arenaId:arena.id,name:'Grupos API '+index}}));
  const groupPairs=[];for(let index=0;index<16;index+=2)groupPairs.push([groupPlayers[index].id,groupPlayers[index+1].id]);
  const groupEvent=(await success(await post('create',{...create,name:'Grupos API',format:'GROUPS',groupCount:'4',pairs:JSON.stringify(groupPairs)}))).eventId;
  const groups=await db.super12Match.findMany({where:{eventId:groupEvent,stage:'GROUP'}});assert.equal(groups.length,4);for(const match of groups)await success(await post('score',{matchId:match.id,homeScore:'6',awayScore:'4'}));
  const race=await Promise.all([post('advance',{eventId:groupEvent}),post('advance',{eventId:groupEvent})]);const outcomes=await Promise.all(race.map(async r=>{assert.equal(r.status,200);return r.json();}));assert.equal(outcomes.filter(r=>r.error===null).length,1);assert.equal(await db.super12Match.count({where:{eventId:groupEvent,stage:'QUARTAS DE FINAL',roundNumber:1}}),4);assert.equal(await db.super12Match.count({where:{eventId:groupEvent,stage:{not:'GROUP'}}}),4);
  await rejection(await post('score',{matchId:groups[0].id,homeScore:'9',awayScore:'1'}));
  for(const path of [`/home?arena=${arena.slug}&section=leagues&eventTab=super12&super12=${groupEvent}`,`/home?arena=${arena.slug}&section=radar`,`/home?arena=${arena.slug}&section=leagues&leagueCategory=${f.category.id}&leagueTab=ranking`]){const page=await fetch(frontendOrigin+path,{headers:{cookie},redirect:'follow'});assert.equal(page.status,200,await page.clone().text());const html=await page.text();assert.equal(html.includes('private-foreign-'),false);assert.equal(html.includes('private-other-notification'),false);}
  assert.equal((await db.categoryMatch.findUniqueOrThrow({where:{id:f.match.id}})).homeScore,6);
  console.log('Portal competition HTTP: public shell only, own session scope, minimal rankings/radar/Super12 DTOs, private profile exclusion, preserved results, creator-only score/finish, notifications, closed-game rejection, concurrent knockout advance and SSR passed.');
 }finally{await cleanupPortalCompetitionFixture(db,f);}
}
