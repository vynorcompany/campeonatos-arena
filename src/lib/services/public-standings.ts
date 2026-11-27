import "server-only";
import {readPortalCompetition} from "@/lib/portal/competition-query";
import {publicArenaShellSchema,publicStandingsSchema} from "@/lib/backend/contracts/portal-competition";
export type {ArenaPublicStandings,PublicArenaShell} from "@/lib/backend/contracts/portal-competition";
export async function getPublicArenaShell(arenaSlug:string){return publicArenaShellSchema.nullable().parse(await readPortalCompetition("shell",{arenaSlug}));}
export async function getArenaPublicStandings(arenaSlug:string,requested:{view?:string;tab?:string;league?:string;status?:string}={}){return publicStandingsSchema.parse(await readPortalCompetition("standings",{arenaSlug,view:requested.view,tab:requested.tab,league:requested.league,status:requested.status}));}
