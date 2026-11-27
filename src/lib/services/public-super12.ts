import "server-only";
import {readPortalCompetition} from "@/lib/portal/competition-query";
import {publicSuper12Schema} from "@/lib/backend/contracts/portal-competition";
export async function getPublicSuper12(arenaSlug:string,_playerId:string,eventId?:string){return publicSuper12Schema.parse(await readPortalCompetition("super12",{arenaSlug,eventId}));}
