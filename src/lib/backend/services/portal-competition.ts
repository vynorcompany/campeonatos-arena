import "server-only";
import {getPublicPlayerAuth} from "./player-session";
import {getPublicArenaShell,getArenaPublicStandings} from "./public-standings";
import {getPublicDoublesRadar} from "./public-doubles-radar";
import {getPublicSuper12} from "./public-super12";
import {portalCompetitionResponses,type PublicArenaShell,type PortalCompetitionView,portalCompetitionQuerySchema} from "../contracts/portal-competition";
const shell=(arena:PublicArenaShell)=>({name:arena.name,logoUrl:arena.logoUrl,athletePortalLogoUrl:arena.athletePortalLogoUrl,slug:arena.slug,athletePortalShowLeagues:arena.athletePortalShowLeagues,athletePortalShowBooking:arena.athletePortalShowBooking,onlineBookingEnabled:arena.onlineBookingEnabled,athletePortalShowReservations:arena.athletePortalShowReservations,athletePortalShowLessons:arena.athletePortalShowLessons,athletePortalShowClasses:arena.athletePortalShowClasses,athletePortalShowDoublesRadar:arena.athletePortalShowDoublesRadar});
type Query=ReturnType<ReturnType<typeof portalCompetitionQuerySchema>["parse"]>;
export async function resolvePortalCompetition(view:PortalCompetitionView,input:Query){
 if(view==="shell"){const data=await getPublicArenaShell(input.arenaSlug);return{authenticated:true,data:portalCompetitionResponses.shell.parse(data?shell(data):null)};}
 const auth=await getPublicPlayerAuth(input.arenaSlug);if(!auth)return{authenticated:false,data:null};
 if(view==="standings"){const data=await getArenaPublicStandings(input.arenaSlug,{view:input.view,tab:input.tab,league:input.league,status:input.status});return{authenticated:true,data:portalCompetitionResponses.standings.parse(data?{...data,arena:shell(data.arena)}:null)};}
 if(view==="radar")return{authenticated:true,data:portalCompetitionResponses.radar.parse(await getPublicDoublesRadar(input.arenaSlug,auth.playerId,{gender:input.gender,category:input.category,athleteId:input.athleteId}))};
 const data=await getPublicSuper12(input.arenaSlug,auth.playerId,input.eventId);if(!data)return{authenticated:true,data:null};
 const event=data.selectedEvent;
 const match=(row:NonNullable<typeof event>["matches"][number])=>({id:row.id,stage:row.stage,roundOrder:row.roundOrder,roundNumber:row.roundNumber,homeScore:row.homeScore,awayScore:row.awayScore,homePair:row.homePair,awayPair:row.awayPair});
 return{authenticated:true,data:portalCompetitionResponses.super12.parse({events:data.events.map(row=>({id:row.id,name:row.name,format:row.format,_count:row._count})),availablePlayers:data.availablePlayers,selectedEvent:event?{id:event.id,name:event.name,format:event.format,status:event.status,creator:{name:event.creator.name},groups:event.groups.map(group=>({id:group.id,name:group.name,pairs:group.pairs.map(pair=>({id:pair.id,name:pair.name})),matches:group.matches.map(match)})),matches:event.matches.map(match),standings:event.standings,isCreator:event.isCreator,knockoutCanAdvance:event.knockoutCanAdvance}:null})};
}
