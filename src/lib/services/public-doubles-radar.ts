import "server-only";
import {readPortalCompetition} from "@/lib/portal/competition-query";
import {doublesRadarSchema} from "@/lib/backend/contracts/portal-competition";
export type {DoublesRadar} from "@/lib/backend/contracts/portal-competition";
export async function getPublicDoublesRadar(arenaSlug:string,_currentPlayerId:string,filters:{gender?:string;category?:string;athleteId?:string}={}){return doublesRadarSchema.parse(await readPortalCompetition("radar",{arenaSlug,gender:filters.gender,category:filters.category,athleteId:filters.athleteId}));}
