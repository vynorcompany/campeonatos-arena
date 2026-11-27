import "server-only";
import type {ArenaRole,SystemRole} from "@/types/auth";
import {managementCookieHeader} from "@/lib/backend/management-context-client";
import {readBackendContract} from "@/lib/backend/http-client";
import {agendaDaySchema,agendaDayInputSchema} from "@/lib/backend/contracts/agenda-day";
export async function getAgendaDay(auth:{arenaId:string;arenaRole:ArenaRole|null;systemRole:SystemRole;editPermissions:string[]},date:string){agendaDayInputSchema.parse({date});const origin=process.env.VX4_BACKEND_ORIGIN;return origin?readBackendContract(origin,`/api/management/agenda?date=${encodeURIComponent(date)}`,agendaDaySchema,{cookie:await managementCookieHeader()??''},{timeoutMs:60000}):(await import('@/lib/backend/services/agenda-day')).resolveAgendaDay(auth,date);}
