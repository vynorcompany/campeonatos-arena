import "server-only";
import { requireFinanceView } from "@/lib/auth/guards";
import { canPerformPermission } from "@/lib/permissions";
import { arenaDatabase } from "@/lib/arena-database";
import { withArenaTransaction } from "@/lib/rls";
import { buildDreRows, dreReportWhere, drePeriod, dreCashPeriod } from "@/lib/reports/dre";
import { ledgerCategories, ledgerPeriod, loadLedgerMovements } from "@/lib/reports/ledger-movements";
import { reservationCourtIds } from "@/lib/reports/reservation-court-filter";
import { formatOccupancy, reservationInsights, reservationStatusLabel } from "@/lib/reports/reservation-insights";
import { loadReservationReportOccurrences } from "@/lib/reports/reservation-report-data";
import { loadDreReportData } from "@/lib/reports/financial-report-data";
import { loadCashReportData, loadComandaReportData, loadOnlinePaymentReportData, loadProductReportData, loadStockReportData } from "@/lib/reports/operational-report-data";
import { visibleProductName } from "@/lib/products/visible-product-names";
import { isActiveCourtOccurrence } from "@/lib/calendar/online-booking-hold";
import { cashReferencePeriod, formatCashReferenceDate } from "@/lib/finance/cash-day";
import { loadPlanReportData } from "@/lib/reports/plan-report-data";
import { reviewedPaymentIdsFromNotes } from "@/lib/payments/review-status";
import { checkoutStatusLabel } from "@/lib/payments/checkout-status";
import { reportQuerySchema, reportWorkspaceSchema, type ReportWorkspace } from "../contracts/report-workspace";
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" }).format((Object.is(value,-0)?0:value)/100);
const date = (value: Date | null) => value ? new Intl.DateTimeFormat("pt-BR",{dateStyle:"short"}).format(value) : "—";
function range(startValue?: string,endValue?: string){const now=new Date();const start=startValue?new Date(`${startValue}T00:00:00`):new Date(now.getFullYear(),now.getMonth(),1);const end=endValue?new Date(`${endValue}T23:59:59.999`):new Date();end.setHours(23,59,59,999);return{start,end};}
export async function resolveReportWorkspace(input: unknown) {
 const query=reportQuerySchema.parse(input),auth=await requireFinanceView("reports"),prisma=arenaDatabase(auth.arenaId);
 const ledgerDates=query.report==="lancamentos"?ledgerPeriod(query.inicio,query.fim):query.report==="dre"?drePeriod(query.inicio,query.fim):null;
 const {start,end}=ledgerDates?{start:ledgerDates.gte,end:ledgerDates.lte}:range(query.inicio,query.fim),period={gte:start,lte:end};
 const reportDay=(value:Date)=>query.report==="dre"?value.toISOString().slice(0,10):new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo"}).format(value);
 const result:ReportWorkspace={report:query.report,startInput:query.inicio??reportDay(start),endInput:query.fim??reportDay(end),metrics:[],headers:[],rows:[],supplementary:{kind:"none"}};
 if(query.report==="caixa"){
  const cashPeriod=cashReferencePeriod(start,end),cash=await withArenaTransaction(auth.arenaId,tx=>loadCashReportData(tx,auth.arenaId,cashPeriod));
  result.metrics=[{label:"Caixas no período",value:cash.registerCount},{label:"Movimentos no período",value:cash.movementCount},{label:"Diferença de fechamento",value:money(cash.differenceCents)}];
  result.headers=["Data","Caixa","Movimento","Operador","Valor"];
  result.rows=cash.registers.flatMap(register=>[{key:`${register.id}-open`,values:[date(register.openedAt),formatCashReferenceDate(register.referenceDate),"Abertura",register.openedByName||"—",money(register.openingAmountCents)]},...register.movements.map(movement=>({key:movement.id,values:[date(movement.createdAt),formatCashReferenceDate(register.referenceDate),movement.type==="SALE"?"Venda":movement.type==="SUPPLY"?"Suprimento":"Sangria",movement.createdByName||"—",money(movement.amountCents)]})),...(register.closedAt?[{key:`${register.id}-close`,values:[date(register.closedAt),formatCashReferenceDate(register.referenceDate),`Fechamento · diferença ${money(register.differenceCents??0)}`,register.closedByName||"—",money(register.countedAmountCents??0)]}]:[])]);
 }else if(query.report==="lancamentos"){
  const ledgerRange=ledgerPeriod(query.inicio,query.fim);
  const [ledger,categories,methods,accounts]=await Promise.all([
   withArenaTransaction(auth.arenaId,tx=>loadLedgerMovements(tx,auth.arenaId,ledgerRange,{type:query.tipo,status:query.situacao,category:query.categoria,paymentMethod:query.forma,bankAccountId:query.banco})),
   prisma.financialCategory.findMany({where:{arenaId:auth.arenaId,active:true},orderBy:{name:"asc"},select:{id:true,name:true}}),
   prisma.paymentMethodSetting.findMany({where:{arenaId:auth.arenaId,active:true},orderBy:{name:"asc"},select:{name:true}}),
   prisma.bankAccount.findMany({where:{arenaId:auth.arenaId,active:true},orderBy:{name:"asc"},select:{id:true,name:true}}),
  ]);
  const methodNames=Array.from(new Set([...methods.map(item=>item.name),...ledger.methods.map(item=>item.label).filter(label=>label!=="Não informada"),...(query.forma?[query.forma]:[])])).sort((a,b)=>a.localeCompare(b,"pt-BR"));
  result.metrics=[{label:"Recebido no período",value:money(ledger.income),tone:"positive"},{label:"Pago no período",value:money(ledger.expense),tone:"negative"},{label:"Saldo movimentado",value:money(ledger.income-ledger.expense)},{label:"A receber · saldo atual",value:money(ledger.receivable)},{label:"A pagar · saldo atual",value:money(ledger.payable)}];
  result.supplementary={kind:"ledger",categories,categoryCatalog:ledgerCategories.map(({value,label})=>({value,label})),methodNames,accounts,methodRows:ledger.methods.map(item=>({key:item.label,values:[item.label,money(item.income),money(item.expense),money(item.income-item.expense)]})),dayRows:ledger.days.map(item=>({key:item.label,values:[item.label.split("-").reverse().join("/"),money(item.income),money(item.expense),money(item.income-item.expense)]}))};
  result.headers=["Data","Descrição","Categoria","Forma","Valor","Situação"];
  result.rows=ledger.records.map((item,index)=>({key:`${item.id}-${index}`,values:[date(new Date(item.date)),item.description,item.category,item.method||"Não informada",`${item.type==="EXPENSE"?"− ":""}${money(item.amount)}`,item.status]}));
 }else if(query.report==="dre"){
  const categories=await prisma.financialCategory.findMany({where:{arenaId:auth.arenaId},select:{name:true,dreGroup:true}}),excludedCategories=["CREDITO_DE_CLIENTE",...categories.filter(category=>category.dreGroup==="EXCLUDE").map(category=>category.name)];
  const [dre,revenueDiscounts,expenseDiscounts]=await Promise.all([
   loadDreReportData(prisma,dreReportWhere(auth.arenaId,period)),
   prisma.financialSettlement.aggregate({where:{arenaId:auth.arenaId,paidAt:dreCashPeriod(period),financialEntry:{arenaId:auth.arenaId,status:{not:"VOIDED"},category:{notIn:excludedCategories},type:{in:["REVENUE","INCOME"]}}},_sum:{discountCents:true}}),
   prisma.financialSettlement.aggregate({where:{arenaId:auth.arenaId,paidAt:dreCashPeriod(period),financialEntry:{arenaId:auth.arenaId,status:{not:"VOIDED"},category:{notIn:excludedCategories},type:"EXPENSE"}},_sum:{discountCents:true}}),
  ]);
  result.supplementary={kind:"dre",statement:buildDreRows(dre.byType,categories,{revenue:revenueDiscounts._sum.discountCents??0,expense:expenseDiscounts._sum.discountCents??0}).map(({label,amount,subtotal})=>({label,amount,subtotal:Boolean(subtotal)}))};
 }else if(query.report==="produtos"){
  const products=await withArenaTransaction(auth.arenaId,tx=>loadProductReportData(tx,auth.arenaId,period));
  result.metrics=[{label:"Itens vendidos",value:products.quantity},{label:"Faturamento",value:money(products.totalCents),tone:"positive"},{label:"Produtos movimentados",value:products.productCount}];result.headers=["Data","Produto","Quantidade","Preço unitário","Total"];
  result.rows=products.items.map(item=>({key:item.id,values:[date(item.sale.createdAt),visibleProductName(products.productNames,item.productId),String(item.quantity),money(item.unitPriceCents),money(item.totalCents)]}));
 }else if(query.report==="estoque"){
  const stock=await withArenaTransaction(auth.arenaId,tx=>loadStockReportData(tx,auth.arenaId,period));
  result.metrics=[{label:"Movimentações",value:stock.movementCount},{label:"Entradas",value:stock.entries,tone:"positive"},{label:"Saídas",value:stock.exits,tone:"negative"}];result.headers=["Data","Produto","Tipo","Quantidade","Motivo"];
  result.rows=stock.movements.map(item=>({key:item.id,values:[date(item.createdAt),visibleProductName(stock.productNames,item.productId),item.type==="IN"?"Entrada":item.type==="OUT"?"Saída":"Contagem",String(item.quantity),item.reason||"—"]}));
 }else if(query.report==="comandas"){
  const commands=await withArenaTransaction(auth.arenaId,tx=>loadComandaReportData(tx,auth.arenaId,period));
  result.metrics=[{label:"Comandas",value:commands.count},{label:"Abertas",value:commands.openCount},{label:"Total finalizado",value:money(commands.totalCents),tone:"positive"}];result.headers=["Abertura","Comanda","Cliente","Itens","Situação","Total"];
  result.rows=commands.comandas.map(item=>({key:item.id,values:[date(item.openedAt),item.code,item.label,String(item._count.items),item.status==="OPEN"?"Aberta":"Finalizada",money(item.sale?.totalCents??0)]}));
 }else if(query.report==="planos"){
  const [planReport,teachers]=await Promise.all([withArenaTransaction(auth.arenaId,tx=>loadPlanReportData(tx,auth.arenaId,period,{teacherId:query.professor,paymentFilter:query.pagamento})),prisma.teacher.findMany({where:{arenaId:auth.arenaId,active:true},orderBy:{name:"asc"},select:{id:true,name:true}})]);
  result.metrics=[{label:"Planos vendidos",value:planReport.soldCount,tone:"positive"},{label:"Assinaturas ativas",value:planReport.activeCount},{label:"Receita mensal ativa",value:money(planReport.activeMonthlyCents),tone:"positive"}];
  const summary=(items:{label:string;count:number;total:number}[])=>items.slice(0,5).map(({label,count,total})=>({label,count,total}));
  result.supplementary={kind:"plans",teachers,planSales:summary(planReport.planSales),monthlySales:summary(planReport.monthlySales)};result.headers=["Data","Aluno","Plano","Aulas/mês","Mensalidade","Situação"];
  result.rows=planReport.subscriptions.map(item=>({key:item.id,values:[date(item.createdAt),item.student.name,item.plan.name,String(item.classesPerMonth),money(item.monthlyPriceCents),item.status==="ACTIVE"?"Ativa":item.status]}));
 }else if(query.report==="pagamentos-online"){
  const checkoutDb=prisma;
  const [checkout,review,reviewCount,entryReview,entryReviewCount,registrationReview,registrationReviewCount]=await Promise.all([
   withArenaTransaction(auth.arenaId,tx=>loadOnlinePaymentReportData(tx,auth.arenaId,period)),
   checkoutDb.onlinePaymentCheckout.findMany({where:{arenaId:auth.arenaId,updatedAt:period,status:"REVIEW"},select:{id:true,mercadoPagoPaymentId:true,player:{select:{name:true}}},orderBy:{updatedAt:"desc"},take:100}),
   checkoutDb.onlinePaymentCheckout.count({where:{arenaId:auth.arenaId,updatedAt:period,status:"REVIEW"}}),
   prisma.financialEntry.findMany({where:{arenaId:auth.arenaId,updatedAt:period,status:{in:["PENDING","OVERDUE"]},notes:{contains:"[MP_REVIEW:"}},select:{id:true,notes:true,counterpartyName:true,description:true,onlinePaymentId:true},orderBy:{updatedAt:"desc"},take:100}),
   prisma.financialEntry.count({where:{arenaId:auth.arenaId,updatedAt:period,status:{in:["PENDING","OVERDUE"]},notes:{contains:"[MP_REVIEW:"}}}),
   prisma.publicTournamentRegistration.findMany({where:{tournament:{arenaId:auth.arenaId},updatedAt:period,status:{in:["PENDING_PAYMENT","CANCELED"]},paymentStatus:"REVIEW"},select:{id:true,mercadoPagoPaymentId:true,leadName:true,partnerName:true},orderBy:{updatedAt:"desc"},take:100}),
   prisma.publicTournamentRegistration.count({where:{tournament:{arenaId:auth.arenaId},updatedAt:period,status:{in:["PENDING_PAYMENT","CANCELED"]},paymentStatus:"REVIEW"}}),
  ]);
  result.metrics=[{label:"Confirmados",value:money(checkout.confirmedCents),tone:"positive"},{label:"Em análise",value:reviewCount+entryReviewCount+registrationReviewCount,tone:"negative"},{label:"Pendentes",value:money(checkout.pendingCents)}];result.headers=["Data","Cliente","Itens","Provedor","Valor","Situação"];
  result.rows=checkout.payments.map(item=>({key:item.id,values:[date(item.createdAt),item.player.name,String(item.items.length),item.provider,money(item.amountCents),checkoutStatusLabel(item.status)]}));
  const canResolve=canPerformPermission("finance:receivable:settle",auth.arenaRole,auth.systemRole,auth.editPermissions),canResolveRegistration=canPerformPermission("tournaments:manage",auth.arenaRole,auth.systemRole,auth.editPermissions);
  if(reviewCount||entryReviewCount||registrationReviewCount)result.supplementary={kind:"reviews",description:reviewCount>review.length||entryReviewCount>entryReview.length||registrationReviewCount>registrationReview.length?"Exibindo até 100 casos de cada tipo atualizados no período. Ajuste as datas para localizar os demais.":"Confira o estorno integral ou cancelamento no Mercado Pago antes de liberar outra tentativa.",cases:[
   ...review.map(item=>({key:item.id,kind:"checkout" as const,recordId:item.id,paymentId:item.mercadoPagoPaymentId,clientName:item.player.name,canResolve})),
   ...entryReview.flatMap(item=>reviewedPaymentIdsFromNotes(item.notes).map(paymentId=>({key:`${item.id}:${paymentId}`,kind:"entry" as const,recordId:item.id,paymentId,clientName:`${item.counterpartyName||"Cliente"} · ${item.description}`,canResolve}))),
   ...registrationReview.map(item=>({key:item.id,kind:"registration" as const,recordId:item.id,paymentId:item.mercadoPagoPaymentId,clientName:`${item.leadName} / ${item.partnerName}`,canResolve:canResolveRegistration})),
  ]};
 }else{
  const courts=await prisma.court.findMany({where:{arenaId:auth.arenaId},include:{weeklyRules:true},orderBy:[{displayOrder:"asc"},{name:"asc"}]}),selectedIds=reservationCourtIds(query.quadra,courts.map(court=>court.id),query.quadras==="selecionadas"),selectedCourts=courts.filter(court=>selectedIds.includes(court.id));
  const occurrenceWhere={arenaId:auth.arenaId,startsAt:{lte:end},endsAt:{gte:start},occurrenceCourts:{some:{courtId:{in:selectedIds}}}},[metricOccurrences,occurrences]=await loadReservationReportOccurrences(prisma,occurrenceWhere);
  const insights=reservationInsights(selectedCourts,metricOccurrences,start,end),volume=(court:typeof insights.highestVolumeCourt)=>court?{courtName:court.courtName,reservations:court.reservations}:null;
  result.metrics=[{label:"Reservas",value:insights.activeReservations},{label:"Ocupação das quadras",value:formatOccupancy(insights.occupiedMinutes,insights.availableMinutes),tone:"positive"},{label:"Participantes",value:metricOccurrences.filter(item=>isActiveCourtOccurrence(item)).reduce((sum,item)=>sum+item._count.participants,0)}];
  result.supplementary={kind:"reservations",courts:courts.map(({id,name,active})=>({id,name,active})),selectedIds,insights:{highestVolumeCourt:volume(insights.highestVolumeCourt),lowestVolumeCourt:volume(insights.lowestVolumeCourt),mostUsedService:insights.mostUsedService?{label:insights.mostUsedService.label,reservations:insights.mostUsedService.reservations}:null,courtInsights:insights.courtInsights.map(({courtId,courtName,reservations,occupiedMinutes,availableMinutes,occupancyPercent})=>({courtId,courtName,reservations,occupiedMinutes,availableMinutes,occupancyPercent}))}};
  result.headers=["Data","Reserva","Quadra","Participantes","Situação"];
  result.rows=occurrences.map(item=>({key:item.id,values:[date(item.startsAt),item.title,item.occurrenceCourts.filter(relation=>selectedIds.includes(relation.courtId)).map(relation=>relation.court.name).join(", ")||"—",String(item.participants.length),reservationStatusLabel(item)]}));
 }
 return reportWorkspaceSchema.parse(result);
}
