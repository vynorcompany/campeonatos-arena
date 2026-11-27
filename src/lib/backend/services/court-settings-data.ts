import "server-only";
import {withArenaTransaction} from "@/lib/rls";
import {courtConfigurationSchema} from "@/lib/backend/contracts/court-settings";
export async function resolveCourtConfiguration(arenaId:string){return withArenaTransaction(arenaId,async tx=>{const[arena,courts]=await Promise.all([
 tx.arena.findUniqueOrThrow({where:{id:arenaId},select:{slug:true,onlineBookingLayout:true,onlineBookingRequiresConfirmation:true,onlineBookingShowReserved:true,onlineBookingPaymentEnabled:true,onlineBookingEnabled:true,onlineBookingLeadTimeMinutes:true,onlineBookingOverdueBlockDays:true,onlineBookingWhatsappMessage:true,onlineBookingWhatsappConfirmationEnabled:true}}),
 tx.court.findMany({where:{arenaId},select:{id:true,name:true,active:true,displayOrder:true,color:true,onlineSlotMinutes:true,onlineDurationMinutes:true,weeklyRules:{select:{id:true,weekday:true,startsAtMinute:true,endsAtMinute:true,priceCents:true,available:true},orderBy:[{weekday:'asc'},{startsAtMinute:'asc'}]}},orderBy:[{active:'desc'},{displayOrder:'asc'},{name:'asc'}]})]);return courtConfigurationSchema.parse({arena,courts});});}
