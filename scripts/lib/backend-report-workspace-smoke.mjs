import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createAgencyPagesFixture,cleanupAgencyPagesFixture} from './backend-agency-pages-smoke.mjs';
const reports=['caixa','lancamentos','produtos','estoque','comandas','dre','planos','reservas','pagamentos-online'];
const at=new Date('2035-01-10T12:00:00Z');
const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value/100);
/** Only disposable local arenas, shared with the native browser validation. */
export async function createReportWorkspaceFixture(db){
 const f=await createAgencyPagesFixture(db);f.reportRows=[];
 try{
  await db.arenaMember.update({where:{userId_arenaId:{userId:f.users[1].id,arenaId:f.arenas[0].id}},data:{role:'STAFF',viewPermissions:['finance:reports:view'],editPermissions:[]}});
  for(const [index,arena] of f.arenas.entries()){
   const arenaId=arena.id,name=index?'private-foreign-report':'Relatório API';
   const player=await db.player.create({data:{arenaId,name:name+' Cliente',cpf:'private-report-cpf',email:'private-report@example.test'}});
   const bank=await db.bankAccount.create({data:{arenaId,name:name+' Banco',bankName:'private-report-bank'}});
   await db.financialCategory.create({data:{arenaId,name:name+' Receita',dreGroup:'REVENUE'}});
   await db.paymentMethodSetting.create({data:{arenaId,name:'PIX'}});
   const entry=await db.financialEntry.create({data:{arenaId,playerId:player.id,bankAccountId:bank.id,type:'REVENUE',category:name+' Receita',description:name+' Cobrança',amountCents:10300,originalAmountCents:10000,creationInterestCents:500,creationDiscountCents:200,status:'PENDING',competenceDate:at,dueDate:at,createdAt:at,notes:'private-report-notes [MP_REVIEW:123456789]',onlinePaymentId:'123456789',updatedAt:at}});
   await db.financialSettlement.create({data:{arenaId,financialEntryId:entry.id,bankAccountId:bank.id,amountCents:3000,interestCents:100,discountCents:50,paymentMethod:'PIX',paidAt:at}});
   const register=await db.cashRegister.create({data:{arenaId,referenceDate:at,openedAt:at,closedAt:at,status:'CLOSED',openingAmountCents:1000,countedAmountCents:1500,differenceCents:100,openingNotes:'private-report-cash',movements:{create:{arenaId,type:'SUPPLY',amountCents:400,createdAt:at}}}});
   const product=await db.product.create({data:{arenaId,name:name+' Produto',priceCents:500,notes:'private-report-product',fiscalProfile:{secret:'private-report-fiscal'}}});
   const comanda=await db.comanda.create({data:{arenaId,playerId:player.id,code:randomUUID(),label:name+' Comanda',status:'CLOSED',openedAt:at,closedAt:at}});
   const sale=await db.sale.create({data:{arenaId,comandaId:comanda.id,code:randomUUID(),paymentMethod:'PIX',totalCents:50500,createdAt:at}});
   // Exceed both operational row limits: summaries must still include every row.
   await db.saleItem.createMany({data:Array.from({length:101},()=>({saleId:sale.id,productId:product.id,quantity:2,unitPriceCents:250,totalCents:500}))});
   await db.stockMovement.createMany({data:Array.from({length:101},()=>({arenaId,productId:product.id,type:'IN',quantity:2,reason:name+' Estoque',createdAt:at}))});
   const student=await db.student.create({data:{arenaId,playerId:player.id,name:name+' Aluno'}}),plan=await db.plan.create({data:{arenaId,name:name+' Plano'}});
   const teacher=await db.teacher.create({data:{arenaId,name:name+' Professor',notes:'private-report-teacher'}});
   await db.teacherPlan.create({data:{arenaId,teacherId:teacher.id,planId:plan.id}});
   await db.studentSubscription.create({data:{arenaId,studentId:student.id,planId:plan.id,monthlyPriceCents:15000,classesPerMonth:8,createdAt:at,notes:'private-report-subscription'}});
   const court=await db.court.create({data:{arenaId,name:name+' Quadra',weeklyRules:{create:Array.from({length:7},(_,weekday)=>({weekday,startsAtMinute:420,endsAtMinute:1380}))}}});
   const occurrence=await db.scheduleOccurrence.create({data:{arenaId,sourceType:'COURT_BOOKING',title:name+' Reserva',startsAt:at,endsAt:new Date(at.getTime()+3600000),notes:'private-report-occurrence',occurrenceCourts:{create:{courtId:court.id}},participants:{create:{playerId:player.id}}}});
   await db.onlinePaymentCheckout.create({data:{arenaId,playerId:player.id,amountCents:500,status:'PAID',createdAt:at,updatedAt:at,checkoutUrl:'https://private-report-provider.invalid'}});
   const checkout=await db.onlinePaymentCheckout.create({data:{arenaId,playerId:player.id,amountCents:700,status:'REVIEW',createdAt:at,updatedAt:at,mercadoPagoPaymentId:'123456780',checkoutUrl:'https://private-report-provider.invalid'}});
   const event=await db.tournament.create({data:{arenaId,name:name+' Evento',categories:{create:{name:name+' Categoria',level:1}}},include:{categories:true}});
   const registration=await db.publicTournamentRegistration.create({data:{tournamentId:event.id,categoryId:event.categories[0].id,leadName:name+' Inscrito',leadPhone:'private-report-phone',leadCpf:'private-report-cpf',partnerName:'',partnerPhone:'',partnerCpf:'',registrationOrder:1,amountCents:800,paymentStatus:'REVIEW',mercadoPagoPaymentId:'123456781',createdAt:at,updatedAt:at}});
   f.reportRows.push({arenaId,player,bank,entry,register,product,comanda,sale,teacher,court,occurrence,checkout,registration});
  }
  return f;
 }catch(error){await cleanupReportWorkspaceFixture(db,f);throw error;}
}
export async function cleanupReportWorkspaceFixture(db,f){
 const ids=f.arenas.map(row=>row.id);
 assert.equal(await db.arena.count({where:{id:{in:ids},createdById:'goal-test',slug:{startsWith:'agency-pages-api-'}}}),ids.length);
 // Restrict edges to the exact owned fixture before cascading its arenas.
 await db.publicTournamentRegistration.deleteMany({where:{tournament:{arenaId:{in:ids}}}});
 await db.scheduleOccurrence.deleteMany({where:{arenaId:{in:ids}}});
 await db.saleItem.deleteMany({where:{sale:{arenaId:{in:ids}}}});
 await db.studentSubscription.deleteMany({where:{arenaId:{in:ids}}});
 await cleanupAgencyPagesFixture(db,f);
}
export async function assertReportWorkspaceSmoke(db,origin,frontendOrigin){
 const f=await createReportWorkspaceFixture(db),own=f.reportRows[0],foreign=f.reportRows[1];
 const get=(query,cookie=f.viewer.cookie)=>fetch(`${origin}/api/management/reports?${query}`,{headers:cookie?{cookie}:{},redirect:'manual'});
 const query=report=>`report=${report}&inicio=2035-01-01&fim=2035-01-31`;
 const read=async suffix=>{const r=await get(suffix);assert.equal(r.status,200,await r.clone().text());assert.equal(r.headers.get('cache-control'),'private, no-store');assert.ok(r.headers.get('vary').toLowerCase().includes('cookie'));return r.json();};
 const snapshot=async()=>Promise.all(f.reportRows.map(async row=>({entry:await db.financialEntry.findUniqueOrThrow({where:{id:row.entry.id}}),settlements:await db.financialSettlement.findMany({where:{arenaId:row.arenaId}}),sales:await db.sale.count({where:{arenaId:row.arenaId}}),items:await db.saleItem.count({where:{sale:{arenaId:row.arenaId}}}),stock:await db.stockMovement.count({where:{arenaId:row.arenaId}}),subscription:await db.studentSubscription.findMany({where:{arenaId:row.arenaId}}),occurrence:await db.scheduleOccurrence.findUniqueOrThrow({where:{id:row.occurrence.id}}),checkout:await db.onlinePaymentCheckout.findMany({where:{arenaId:row.arenaId},orderBy:{id:'asc'}}),registration:await db.publicTournamentRegistration.findUniqueOrThrow({where:{id:row.registration.id}})})));
 try{
  const before=await snapshot();assert.equal((await get(query('caixa'),'')).status,307);
  await db.arenaMember.update({where:{userId_arenaId:{userId:f.users[1].id,arenaId:own.arenaId}},data:{viewPermissions:[]}});assert.equal((await get(query('caixa'))).status,403);
  await db.arenaMember.update({where:{userId_arenaId:{userId:f.users[1].id,arenaId:own.arenaId}},data:{viewPermissions:['finance:reports:view']}});
  for(const bad of ['','report=unknown',query('caixa')+'&arenaId='+foreign.arenaId,query('caixa')+'&userId=forged',query('caixa')+'&report=dre',query('caixa')+'&fim=2035-02-01'])assert.equal((await get(bad)).status,400,bad);
  const result={};
  for(const report of reports){
   const data=await read(query(report));result[report]=data;assert.equal(data.report,report);assert.equal(data.startInput,'2035-01-01');assert.equal(data.endInput,'2035-01-31');assert.ok(data.rows.every(row=>row.values.length===data.headers.length));
   for(const marker of ['private-foreign-report','private-report-','passwordHash','fiscalProfile','checkoutUrl','arenaId'])assert.equal(JSON.stringify(data).includes(marker),false,report+marker);
   const response=await fetch(`${frontendOrigin}/relatorios/${report}?inicio=2035-01-01&fim=2035-01-31`,{headers:{cookie:f.viewer.cookie},redirect:'manual'});assert.equal(response.status,200,report);const html=await response.text();assert.ok(html.includes('2035-01-31'));for(const marker of ['private-foreign-report','private-report-'])assert.equal(html.includes(marker),false,report+marker);
  }
  assert.equal(result.caixa.rows.length,3);assert.equal(result.caixa.metrics[0].value,1);assert.equal(result.caixa.metrics[2].value,money(100));
  assert.equal(result.produtos.rows.length,100);assert.equal(result.produtos.metrics[0].value,202);assert.equal(result.produtos.metrics[1].value,money(50500));
  assert.equal(result.estoque.rows.length,100);assert.equal(result.estoque.metrics[0].value,101);assert.equal(result.estoque.metrics[1].value,202);
  assert.equal(result.comandas.rows.length,1);assert.equal(result.comandas.metrics[2].value,money(50500));
  assert.equal(result.planos.metrics[0].value,1);assert.equal(result.planos.metrics[2].value,money(15000));
  assert.equal(result.dre.supplementary.statement.find(row=>row.label==='Receita bruta').amount,10300);assert.equal(result.dre.supplementary.statement.find(row=>row.label==='(−) Deduções da receita').amount,-50);
  assert.equal(result.lancamentos.metrics[0].value,money(3000));assert.equal(result.lancamentos.metrics[3].value,money(7350));assert.equal(result.lancamentos.supplementary.accounts.length,1);
  assert.equal(result.reservas.metrics[0].value,1);assert.equal(result.reservas.metrics[2].value,1);
  const payment=result['pagamentos-online'];assert.equal(payment.metrics[0].value,money(500));assert.equal(payment.metrics[1].value,3);assert.deepEqual(payment.supplementary.cases.map(row=>row.kind).sort(),['checkout','entry','registration']);assert.ok(payment.supplementary.cases.every(row=>row.canResolve===false));
  await db.arenaMember.update({where:{userId_arenaId:{userId:f.users[1].id,arenaId:own.arenaId}},data:{editPermissions:['finance:receivable:settle']}});
  const permitted=await read(query('pagamentos-online'));assert.ok(permitted.supplementary.cases.filter(row=>row.kind!=='registration').every(row=>row.canResolve));assert.equal(permitted.supplementary.cases.find(row=>row.kind==='registration').canResolve,false);
  for(const suffix of [`&quadras=selecionadas`,`&quadra=${foreign.court.id}`]){const filtered=await read(query('reservas')+suffix);assert.equal(filtered.rows.length,0);assert.equal(filtered.metrics[0].value,0);}
  const multiple=await read(query('reservas')+`&quadra=${own.court.id}&quadra=${foreign.court.id}`);assert.equal(multiple.rows.length,1);assert.deepEqual(multiple.supplementary.selectedIds,[own.court.id]);
  const hidden=await read(query('lancamentos')+`&banco=${foreign.bank.id}`);assert.equal(hidden.rows.length,0);assert.equal(hidden.metrics[0].value,money(0));
  const noTeacher=await read(query('planos')+`&professor=${foreign.teacher.id}`);assert.equal(noTeacher.rows.length,0);
  assert.deepEqual(await snapshot(),before,'Report GET/SSR must not settle, charge, rewrite, or erase any source data');
  console.log('Reports HTTP: nine authenticated reports/SSR, strict query and tenant scope, full aggregates beyond display limits, partial settlements/discounts/DRE, review permissions, repeated court filters and source-data preservation passed.');
 }finally{await cleanupReportWorkspaceFixture(db,f);}
}
