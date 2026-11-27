import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';

/** @param {import('@prisma/client').PrismaClient} db */
export async function createPortalClientFixture(db){
 const arena=await db.arena.create({data:{name:'Portal Client API',slug:'portal-client-api-'+randomUUID(),createdById:'goal-test'}});
 const foreign=await db.arena.create({data:{name:'Foreign Portal Client',slug:'portal-client-api-'+randomUUID(),createdById:'goal-test'}});
 const player=await db.player.create({data:{arenaId:arena.id,name:'Atleta Portal API',phone:'41900000011',email:'private-portal-client@example.test',bio:'private-portal-client-bio'}});
 const other=await db.player.create({data:{arenaId:arena.id,name:'private-other-athlete',phone:'41900000012'}});
 const account=await db.playerAccount.create({data:{arenaId:arena.id,playerId:player.id,phone:player.phone,passwordHash:'private-portal-client-password-hash'}});
 const token=randomUUID()+randomUUID();
 await db.playerSession.create({data:{playerAccountId:account.id,token:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+3600000)}});
 const bank=await db.bankAccount.create({data:{arenaId:arena.id,name:'Portal receiving account'}});
 await db.arenaOperationalSettings.create({data:{arenaId:arena.id,portalConsumptionEnabled:true,portalPaymentsConfigured:true,portalPaymentEnabled:true,portalPixEnabled:true,portalPaymentBankAccountId:bank.id}});
 const today=new Date(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())+'T12:00:00Z');
 const yesterday=new Date(today.getTime()-86400000);
 const own=await db.financialEntry.create({data:{arenaId:arena.id,playerId:player.id,type:'REVENUE',category:'Portal QA',description:'Portal due today',amountCents:1000,dueDate:today,onlinePaymentUrl:'https://payments.example/own'}});
 const overdue=await db.financialEntry.create({data:{arenaId:arena.id,playerId:player.id,type:'REVENUE',category:'Portal QA',description:'Portal overdue',amountCents:2000,dueDate:yesterday}});
 const paid=await db.financialEntry.create({data:{arenaId:arena.id,playerId:player.id,type:'REVENUE',category:'Portal QA',description:'Portal already paid',amountCents:3000,dueDate:yesterday,status:'PAID',paidAt:new Date()}});
 await db.financialEntry.create({data:{arenaId:arena.id,playerId:other.id,type:'REVENUE',category:'Portal QA',description:'private-other-financial-entry',amountCents:7777,dueDate:today}});
 await db.portalAnnouncement.createMany({data:[{arenaId:arena.id,title:'Portal own notice',message:'Publicado',pinned:true},{arenaId:arena.id,title:'private-inactive-announcement',message:'Hidden',active:false},{arenaId:foreign.id,title:'private-foreign-announcement',message:'Hidden'}]});
 await db.portalEventPost.create({data:{arenaId:arena.id,title:'Portal post without link',imageUrl:'/brand/vx4-logo.svg'}});
 await db.calendarEvent.create({data:{arenaId:arena.id,title:'Portal featured event',scheduledAt:new Date('2035-03-01T12:00:00Z'),notes:'Public event notes',featuredInPortal:true}});
 const category=await db.productCategory.create({data:{arenaId:arena.id,name:'Bebidas API'}});
 const ingredient=await db.product.create({data:{arenaId:arena.id,name:'Leite API',stockQuantity:4,priceCents:100}});
 const unavailable=await db.product.create({data:{arenaId:arena.id,name:'Leite indisponível API',stockQuantity:0,priceCents:100}});
 const product=await db.product.create({data:{arenaId:arena.id,name:'Café API',categoryId:category.id,stockQuantity:8,priceCents:500,costCents:123,notes:'private-product-notes',stockChoices:[{id:'milk',label:'Leite',options:[{productId:ingredient.id,quantity:1},{productId:unavailable.id,quantity:1}]}]}});
 const tab=await db.comanda.create({data:{arenaId:arena.id,playerId:player.id,label:player.name,code:'PORTAL-'+randomUUID(),openedByUserName:'Recepção API',items:{create:{productId:product.id,quantity:2,unitPriceCents:500,totalCents:1000}}}});
 await db.comanda.create({data:{arenaId:arena.id,playerId:other.id,label:'private-other-tab',code:'PRIVATE-'+randomUUID(),items:{create:{productId:ingredient.id,quantity:1,unitPriceCents:100,totalCents:100}}}});
 const bookingEntry=await db.financialEntry.create({data:{arenaId:arena.id,playerId:player.id,type:'REVENUE',category:'Portal QA',description:'Portal linked reservation',amountCents:2500,dueDate:today}});
 const booking=await db.scheduleOccurrence.create({data:{arenaId:arena.id,sourceType:'BOOKING',title:'Reserva Portal API',startsAt:new Date('2035-02-01T14:00:00Z'),endsAt:new Date('2035-02-01T15:00:00Z'),participants:{create:{playerId:player.id,amountCents:2500,financialEntryId:bookingEntry.id}}},include:{participants:true}});
 await db.comandaBookingService.create({data:{comandaId:tab.id,participantId:booking.participants[0].id}});
 return {arena,foreign,player,other,own,overdue,paid,product,tab,booking,token,cookie:`arena_player_session=${token}`};
}

/** @param {import('@prisma/client').PrismaClient} db @param {Awaited<ReturnType<typeof createPortalClientFixture>>} fixture */
export async function cleanupPortalClientFixture(db,fixture){
 const ids=[fixture.arena.id,fixture.foreign.id];
 const arenas=await db.arena.findMany({where:{id:{in:ids}},select:{slug:true,createdById:true}});
 assert.equal(arenas.length,2);assert.ok(arenas.every(a=>a.slug.startsWith('portal-client-api-')&&a.createdById==='goal-test'));
 await db.comanda.deleteMany({where:{arenaId:{in:ids}}});
 await db.scheduleOccurrence.deleteMany({where:{arenaId:{in:ids}}});
 await db.financialEntry.deleteMany({where:{arenaId:{in:ids}}});
 await db.arena.deleteMany({where:{id:{in:ids},createdById:'goal-test',slug:{startsWith:'portal-client-api-'}}});
}

/** @param {import('@prisma/client').PrismaClient} db */
export async function assertPortalClientSmoke(db,origin,frontendOrigin){
 const fixture=await createPortalClientFixture(db);
 const {arena,foreign,player,own,overdue,paid,product,tab,cookie}=fixture;
 const get=(view,extra='',requestCookie=cookie,slug=arena.slug)=>fetch(`${origin}/api/portal/client/${view}?arenaSlug=${slug}${extra}`,{headers:requestCookie?{cookie:requestCookie}:{},redirect:'manual'});
 try{
  for(const view of ['home','finance','comandas']){
   assert.equal((await get(view,'','')).status,401);
   assert.equal((await get(view,'',cookie,foreign.slug)).status,401);
   for(const extra of ['&playerId='+player.id,'&arenaId='+foreign.id,'&arenaSlug='+arena.slug])assert.equal((await get(view,extra)).status,400);
  }
  assert.equal((await get('home','&catalog=false')).status,400);
  assert.equal((await get('comandas','&catalog=0')).status,400);
  const homeResponse=await get('home');assert.equal(homeResponse.status,200,await homeResponse.clone().text());assert.match(homeResponse.headers.get('cache-control'),/private, no-store/);
  const home=await homeResponse.json();assert.deepEqual(home.announcements.map(a=>a.title),['Portal own notice']);assert.equal(home.eventPosts[0].linkUrl,null);assert.equal(home.events[0].title,'Portal featured event');assert.equal(home.events[0].scheduledAt,'2035-03-01T12:00:00.000Z');assert.equal(home.upcomingReservations[0].title,'Reserva Portal API');assert.equal(home.summary.reservations,1);assert.equal(home.summary.financialStatus,'overdue');
  assert.ok(home.charges.some(c=>c.id===own.id));assert.equal(JSON.stringify(home).includes('private-'),false);
  const financeResponse=await get('finance');assert.equal(financeResponse.status,200,await financeResponse.clone().text());const finance=await financeResponse.json();assert.ok(finance.open.some(e=>e.id===own.id));assert.ok(finance.overdue.some(e=>e.id===overdue.id));assert.ok(finance.paid.some(e=>e.id===paid.id));assert.equal(JSON.stringify(finance).includes('private-'),false);
  const response=await get('comandas');assert.equal(response.status,200,await response.clone().text());const commands=await response.json();assert.equal(commands.comandas.length,1);assert.equal(commands.comandas[0].id,tab.id);assert.equal(commands.comandas[0].totalCents,3500);assert.equal(commands.comandas[0].bookingServices[0].amountCents,2500);assert.equal(commands.products.find(p=>p.id===product.id).stockQuantity,4);assert.equal(commands.products.find(p=>p.id===product.id).composition.groups[0].options[0].name,'Leite API');
  for(const hidden of ['private-','costCents','stockAggregates','passwordHash','notes'])assert.equal(JSON.stringify(commands).includes(hidden),false);
  const lite=await(await get('comandas','&catalog=false')).json();assert.deepEqual(lite.products,[]);assert.deepEqual(lite.categories,[]);assert.deepEqual(lite.comandas,commands.comandas);
  const live=await fetch(origin+`/api/portal/comandas?arenaSlug=${arena.slug}`,{headers:{cookie}});assert.equal(live.status,200);assert.deepEqual((await live.json()).comandas,commands.comandas);
  const frontendLive=await fetch(frontendOrigin+`/api/portal/comandas?arenaSlug=${arena.slug}`,{headers:{cookie}});assert.equal(frontendLive.status,200);assert.deepEqual((await frontendLive.json()).comandas,commands.comandas);
  const liveEtag=frontendLive.headers.get('etag');assert.ok(liveEtag);assert.equal((await fetch(frontendOrigin+`/api/portal/comandas?arenaSlug=${arena.slug}`,{headers:{cookie,'if-none-match':liveEtag}})).status,304);
  for(const section of ['home','finance','comandas']){const page=await fetch(`${frontendOrigin}/home?arena=${arena.slug}&section=${section}`,{headers:{cookie},redirect:'follow'});assert.equal(page.status,200,await page.clone().text());const html=await page.text();assert.equal(html.includes('private-other-'),false);assert.equal(html.includes('private-product-notes'),false);}
  await db.arenaOperationalSettings.update({where:{arenaId:arena.id},data:{portalConsumptionEnabled:false}});
  const hiddenHome=await(await get('home')).json();assert.equal(hiddenHome.financialVisible,false);assert.deepEqual(hiddenHome.charges,[]);
  const hiddenFinance=await(await get('finance')).json();assert.equal(hiddenFinance.disabled,true);assert.deepEqual(hiddenFinance.overdue,[]);assert.deepEqual(hiddenFinance.open,[]);assert.deepEqual(hiddenFinance.paid,[]);
  assert.deepEqual(await(await get('comandas')).json(),{disabled:true,comandas:[],categories:[],products:[]});
  console.log('Portal client HTTP: session-derived identity, tenant/field isolation, private projections, own and linked reservation balances, paid/current/overdue finance, nullable event links, composition capacity, catalog-free polling, SSR and disabled visibility passed.');
 }finally{await cleanupPortalClientFixture(db,fixture);}
}
