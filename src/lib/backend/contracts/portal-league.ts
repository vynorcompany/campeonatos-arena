import {z} from "zod";
const text=z.string(),n=z.number().int(),b=z.boolean(),identity=z.object({id:text,name:text}).strict();
const format=z.enum(["LEAGUE","THREE_GROUPS","FOUR_GROUPS","SIMPLE","TRIO"]);
const schedule=z.object({weekday:n,startTime:text,capacity:n}).strict();
const namedSchedule=z.object({id:text,title:text,when:text,status:text}).strict();
export const portalLeagueQuerySchema=z.object({arenaSlug:text.trim().min(1).max(160),categoryId:text.max(160).optional()}).strict();
export const portalLeagueSchema=z.object({
 playerId:text,arenaSlug:text,makeupEnabled:b,
 leagueCategories:z.array(z.object({id:text,format,label:text,member:b,registrationFeeCents:n}).strict()),
 selectedLeagueCategoryId:text.nullable(),selectedLeagueFormat:format.nullable(),selectedEventRules:text.nullable(),
 selectedLeaguePairs:z.array(z.object({id:text,name:text,groupName:text,players:z.array(identity)}).strict()),
 leagueResults:z.array(z.object({id:text,block:n.nullable(),period:text,canSchedule:b,reservationStatus:text.nullable(),reservationLabel:text.nullable(),canRecordResult:b,homePlayers:z.array(identity),awayPlayers:z.array(identity),trioGames:z.array(z.object({gameNumber:n,homePlayerIds:z.array(text),awayPlayerIds:z.array(text),homeScore:n.nullable(),awayScore:n.nullable()}).strict()),homePairName:text,awayPairName:text,homeScore:n.nullable(),awayScore:n.nullable(),updatedAt:text.datetime(),setScores:z.array(z.tuple([n,n])),scheduledDate:text.nullable(),scheduledTime:text.nullable(),scheduledAtLabel:text.nullable(),finished:b}).strict()),
 pairs:z.array(z.object({id:text,categoryId:text,name:text,categoryName:text,eventName:text,groupName:text,players:z.array(identity),medicalRequestPending:b,opponents:z.array(z.object({matchId:text,id:text,name:text,block:n.nullable()}).strict())}).strict()),
 challenges:z.array(z.object({id:text,categoryId:text,status:text,opponent:text,proposer:text,court:text,proposedAt:text,responseDueAt:text,block:n.nullable(),incoming:b}).strict()),
 leagueNotifications:z.array(z.object({id:text,title:text,message:text,href:text,createdAt:text.datetime()}).strict()),
 slots:z.array(z.object({value:text,courtId:text,courtName:text,courtColor:text,startsAt:text,durationMinutes:n,label:text}).strict()),
 replacementPlayers:z.array(identity),prizes:z.array(z.object({id:text,eventName:text,categoryName:text,description:text}).strict()),
 reservations:z.array(namedSchedule.omit({when:true}).extend({canShareGame:b,courtName:text,when:text}).strict()),
 lessons:z.array(namedSchedule.extend({teacherName:text,checkedIn:b,makeupRequested:b}).strict()),
 teachers:z.array(identity),classes:z.array(namedSchedule.extend({teacherId:text,teacherName:text}).strict()),
 classGroups:z.array(z.object({id:text,name:text,teacherId:text,teacherName:text,schedules:z.array(schedule),enrolledCount:n,enrolled:b,requestPending:b,available:b}).strict()),
 student:z.object({remainingClasses:n,attendedClasses:n,missedClasses:n,active:b,planName:text,teacherName:text}).strict().nullable(),
 teacherManagement:z.object({plans:z.array(z.object({id:text,name:text,classesPerMonth:n,monthlyPriceCents:n}).strict()),students:z.array(z.object({id:text,name:text,remainingClasses:n,initialMonthlyClasses:n,planName:text,classGroup:identity.nullable(),requestedMakeups:n,pendingMakeups:z.array(text)}).strict()),makeupSlots:z.array(z.object({value:text,label:text}).strict()),agenda:z.array(namedSchedule),classGroups:z.array(z.object({id:text,name:text,schedules:z.array(schedule.extend({id:text}).strict()),enrolledCount:n,students:z.array(identity)}).strict())}).strict().nullable(),
}).strict().nullable();
export type PortalLeagueDto=z.infer<typeof portalLeagueSchema>;
export function decodePortalLeague(data:PortalLeagueDto){return data?{...data,leagueResults:data.leagueResults.map(row=>({...row,updatedAt:new Date(row.updatedAt)})),leagueNotifications:data.leagueNotifications.map(row=>({...row,createdAt:new Date(row.createdAt)}))}:null;}
