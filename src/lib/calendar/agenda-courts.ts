import type {Prisma} from '@prisma/client';
import {activeCourtOccurrenceWhere} from './online-booking-hold';

/** Removing availability affects new bookings, not the visibility of existing reservations. */
export function agendaCourtsWhere(arenaId:string,dayStart:Date,dayEnd:Date):Prisma.CourtWhereInput {
 return {
  arenaId,active:true,
  OR:[
   {weeklyRules:{some:{}}},
   {occurrenceCourts:{some:{occurrence:{arenaId,...activeCourtOccurrenceWhere(),startsAt:{lt:dayEnd},endsAt:{gt:dayStart}}}}}
  ]
 };
}
