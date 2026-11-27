import "server-only";
import {withArenaTransaction} from "@/lib/rls";
import {canPerformPermission} from "@/lib/permissions";
import type {ArenaRole,SystemRole} from "@/types/auth";
import {agendaDaySchema,parseAgendaDay} from "@/lib/backend/contracts/agenda-day";
import {agendaCourtsWhere} from "@/lib/calendar/agenda-courts";
import {activeCourtOccurrenceWhere} from "@/lib/calendar/online-booking-hold";
import {reservationCreditBalances} from "@/lib/plans/reservation-credits";
import {courtRulesForDate} from "@/lib/calendar/date-availability";
import {standardServicePrices,serviceBookingName} from "@/lib/calendar/standard-services";
import {agendaVersion} from "@/lib/calendar/agenda-version";
import {isReservationChargePaid} from "@/lib/finance/reservation-payment";
import {isConfirmedSchedulePaymentMethod} from "@/lib/calendar/booking-payment-claim";
type Scope={arenaId:string;arenaRole:ArenaRole|null;systemRole:SystemRole;editPermissions:string[]};
const minute=(value:Date)=>value.getHours()*60+value.getMinutes();
export async function resolveAgendaDay(auth:Scope,date:string){
 const selectedDate=parseAgendaDay(date);if(!selectedDate)throw Error('Data inválida.');const nextDay=new Date(selectedDate);nextDay.setDate(nextDay.getDate()+1);
 const canReceive=canPerformPermission('finance:receivable:settle',auth.arenaRole,auth.systemRole,auth.editPermissions);
 const canEdit=canPerformPermission('calendar:booking:edit',auth.arenaRole,auth.systemRole,auth.editPermissions);
 const canManage=canPerformPermission('calendar:settings:manage',auth.arenaRole,auth.systemRole,auth.editPermissions);
 return withArenaTransaction(auth.arenaId,async tx=>{
  const[settings,storedCourts,occurrences,storedPlayers,teachers,storedBookingTypes,prices,services,bankAccounts]=await Promise.all([
   tx.arena.findUniqueOrThrow({where:{id:auth.arenaId},select:{slug:true,scheduleStartMinute:true,scheduleEndMinute:true,scheduleSlotMinutes:true,onlineBookingLayout:true,onlineBookingRequiresConfirmation:true,onlineBookingShowReserved:true,onlineBookingPaymentEnabled:true,onlineBookingEnabled:true,onlineBookingLeadTimeMinutes:true,onlineBookingOverdueBlockDays:true,onlineBookingWhatsappMessage:true,onlineBookingWhatsappConfirmationEnabled:true}}),
   tx.court.findMany({where:agendaCourtsWhere(auth.arenaId,selectedDate,nextDay),select:{id:true,name:true,color:true,dateAvailability:true,weeklyRules:{select:{weekday:true,startsAtMinute:true,endsAtMinute:true,priceCents:true,available:true}}},orderBy:[{displayOrder:'asc'},{name:'asc'}]}),
   tx.scheduleOccurrence.findMany({where:{arenaId:auth.arenaId,...activeCourtOccurrenceWhere(),startsAt:{lt:nextDay},endsAt:{gt:selectedDate}},select:{id:true,updatedAt:true,createdAt:true,sourceType:true,status:true,title:true,bookingTypeName:true,notes:true,startsAt:true,endsAt:true,courtPriceCents:true,responsiblePlayerId:true,teacherId:true,occurrenceCourts:{where:{court:{arenaId:auth.arenaId}},select:{courtId:true}},participants:{orderBy:{id:'asc'},select:{id:true,playerId:true,amountCents:true,paymentMethod:true,checkedInAt:true,financialEntry:{select:{bankAccountId:true,status:true,reservationSplitParts:{select:{status:true}}}}}},serviceReservations:{orderBy:{id:'asc'},select:{id:true,serviceName:true,priceCents:true}}},orderBy:[{startsAt:'asc'},{id:'asc'}]}),
   tx.player.findMany({where:{arenaId:auth.arenaId,active:true},select:{id:true,name:true,photoUrl:true},orderBy:{name:'asc'}}),
   tx.teacher.findMany({where:{arenaId:auth.arenaId,active:true},select:{id:true,name:true},orderBy:{name:'asc'}}),
   tx.bookingType.findMany({where:{arenaId:auth.arenaId,active:true},select:{name:true},orderBy:{name:'asc'}}),
   tx.arenaServicePrice.findMany({where:{arenaId:auth.arenaId},select:{serviceCode:true,priceCents:true}}),
   tx.product.findMany({where:{arenaId:auth.arenaId,active:true,isService:true},select:{id:true,name:true,sku:true,priceCents:true,showOnAgenda:true}}),
   canReceive?tx.bankAccount.findMany({where:{arenaId:auth.arenaId,active:true},select:{id:true,name:true},orderBy:{name:'asc'}}):Promise.resolve([])
  ]);
  const balances=await reservationCreditBalances(tx,auth.arenaId,storedPlayers.map(p=>p.id));
  const events=occurrences.length?await tx.auditEvent.findMany({where:{arenaId:auth.arenaId,action:'booking.created',entityId:{in:occurrences.map(row=>row.id)}},select:{entityId:true,actorName:true},orderBy:{createdAt:'asc'}}):[];
  const creators=new Map(events.map(e=>[e.entityId,e.actorName]));const hidden=new Set(services.filter(s=>!s.showOnAgenda).map(serviceBookingName));
  const arena={slug:settings.slug,scheduleStartMinute:settings.scheduleStartMinute,scheduleEndMinute:settings.scheduleEndMinute,scheduleSlotMinutes:settings.scheduleSlotMinutes};
  return agendaDaySchema.parse({date,arena,
   version:agendaVersion(occurrences.map(row=>({id:row.id,updatedAt:row.updatedAt,status:row.status,participants:row.participants.map(p=>({id:p.id,checkedInAt:p.checkedInAt})),serviceReservations:row.serviceReservations.map(service=>({id:service.id}))}))),
   courts:storedCourts.map(({dateAvailability,weeklyRules,...court})=>({...court,weeklyRules:courtRulesForDate(weeklyRules,dateAvailability,selectedDate)})),
   scheduleOccurrences:occurrences.map(({startsAt,endsAt,updatedAt,createdAt,participants,...row})=>({...row,startsAtMinute:minute(startsAt),endsAtMinute:minute(endsAt),updatedAt:updatedAt.toISOString(),createdAt:createdAt.toISOString(),createdBy:creators.get(row.id)??'Não registrado',participants:participants.map(p=>({playerId:p.playerId,amountCents:p.amountCents,paymentMethod:isConfirmedSchedulePaymentMethod(p.paymentMethod)?p.paymentMethod:'',checkedInAt:p.checkedInAt?.toISOString()??null,paid:isReservationChargePaid(p.financialEntry),bankAccountId:canReceive||canEdit?p.financialEntry?.bankAccountId??null:null}))})),
   players:storedPlayers.map(p=>({...p,reservationCredits:balances.get(p.id)??0})),teachers,bankAccounts,
   bookingTypes:Array.from(new Set(['Aula','Aula fixa','Plano','Super 12','Liga','Reserva',...storedBookingTypes.map(t=>t.name),...services.filter(s=>s.showOnAgenda).map(serviceBookingName)])).filter(name=>!hidden.has(name)),
   servicePriceValues:{...standardServicePrices(prices),...Object.fromEntries(services.map(s=>[serviceBookingName(s),s.priceCents]))},
   availableServices:services.filter(s=>s.showOnAgenda).map(s=>({id:s.id,name:s.name})),
   onlineSettings:canManage?{arenaSlug:settings.slug,layout:settings.onlineBookingLayout,requiresConfirmation:settings.onlineBookingRequiresConfirmation,showReserved:settings.onlineBookingShowReserved,paymentOnlineEnabled:settings.onlineBookingPaymentEnabled,enabled:settings.onlineBookingEnabled,leadTimeMinutes:settings.onlineBookingLeadTimeMinutes,overdueBlockDays:settings.onlineBookingOverdueBlockDays,whatsappMessage:settings.onlineBookingWhatsappMessage,whatsappConfirmationEnabled:settings.onlineBookingWhatsappConfirmationEnabled}:null
  });
 },{maxWait:10000,timeout:20000});
}
