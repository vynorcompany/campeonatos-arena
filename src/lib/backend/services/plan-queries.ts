import"server-only";
import{withArenaTransaction}from"@/lib/rls";
import{planListSchema,planDetailSchema,type PlanListQuery}from"../contracts/plan-queries";
const planSelect={id:true,name:true,kind:true,sponsorshipType:true,monthlyAmountCents:true,reservationCredits:true,lessonCredits:true,prorateFifthWeek:true}as const;
export async function resolvePlanList(arenaId:string,query:PlanListQuery){
 return withArenaTransaction(arenaId,async tx=>{
  const[rows,typeRows,courts]=await Promise.all([
   tx.sponsorshipPlan.findMany({where:{arenaId,...(query.kind?{kind:query.kind}:{}),...(query.q?.trim()?{name:{contains:query.q.trim(),mode:"insensitive"}}:{}),...(query.type?.trim()?{sponsorshipType:query.type.trim()}:{})},select:{...planSelect,bookingSeries:{where:{status:"ACTIVE"},select:{id:true,responsiblePlayerId:true,fixedPlanEnrollmentId:true}},_count:{select:{sponsors:true}}},orderBy:{createdAt:"asc"}}),
   tx.sponsorshipPlan.findMany({where:{arenaId},select:{sponsorshipType:true},distinct:["sponsorshipType"]}),
   tx.court.findMany({where:{arenaId,active:true},select:{id:true,name:true},orderBy:{name:"asc"}}),
  ]);
  const plans=rows.map(({bookingSeries,_count,...row})=>({...row,linkCount:row.kind==="FIXED_COURT"?new Set(bookingSeries.map(series=>series.responsiblePlayerId??series.fixedPlanEnrollmentId??series.id)).size:_count.sponsors})).sort((a,b)=>query.sort==="value"?b.monthlyAmountCents-a.monthlyAmountCents:query.sort==="companies"?b.linkCount-a.linkCount:a.name.localeCompare(b.name,"pt-BR"));
  return planListSchema.parse({plans,planTypes:typeRows.map(row=>row.sponsorshipType).sort((a,b)=>a.localeCompare(b,"pt-BR")),courts});
 });
}
export async function resolvePlanDetail(arenaId:string,id:string){
 return withArenaTransaction(arenaId,async tx=>{
  const plan=await tx.sponsorshipPlan.findFirst({where:{id,arenaId},select:{...planSelect,dueDay:true,dueDays:true,sponsors:{select:{id:true,name:true,logoUrl:true,displayOrder:true,installments:true,dueDay:true,player:{select:{name:true}}},orderBy:[{displayOrder:"asc"},{createdAt:"asc"}]}}});
  if(!plan)return null;
  const[clientRows,planBanks,planMethods]=await Promise.all([tx.player.findMany({where:{arenaId,active:true},select:{id:true,name:true,phone:true},orderBy:{name:"asc"}}),tx.bankAccount.findMany({where:{arenaId,active:true},select:{id:true,name:true}}),tx.paymentMethodSetting.findMany({where:{arenaId,active:true},select:{name:true}})]);
  const[series,courts,banks,methods]=plan.kind==="FIXED_COURT"?await Promise.all([
   tx.scheduleBookingSeries.findMany({where:{arenaId,sponsorshipPlanId:plan.id},select:{id:true,responsiblePlayerId:true,fixedPlanEnrollmentId:true,status:true,dueDay:true,startsAt:true,endsAt:true,responsiblePlayer:{select:{name:true}},occurrences:{take:1,select:{occurrenceCourts:{select:{court:{select:{name:true}}}}}}},orderBy:{startsAt:"desc"}}),
   tx.court.findMany({where:{arenaId,active:true},select:{id:true,name:true,onlineSlotMinutes:true,weeklyRules:{select:{weekday:true,startsAtMinute:true,endsAtMinute:true,available:true}}}}),
   tx.bankAccount.findMany({where:{arenaId,active:true},select:{id:true,name:true}}),tx.paymentMethodSetting.findMany({where:{arenaId,active:true,name:{notIn:["CREDIT_BALANCE","Saldo de crédito"]}},select:{name:true}}),
  ]):[[],[],[],[]];
  return planDetailSchema.parse({plan,clients:clientRows.map(row=>({...row,phone:plan.kind==="FIXED_COURT"?"":row.phone})),planBanks,planMethods,series:series.map(row=>({...row,startsAt:row.startsAt.toISOString(),endsAt:row.endsAt.toISOString()})),courts,banks,methods});
 });
}
