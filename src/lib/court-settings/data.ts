import "server-only";
import {managementCookieHeader} from "@/lib/backend/management-context-client";
import {readBackendContract} from "@/lib/backend/http-client";
import {courtConfigurationSchema} from "@/lib/backend/contracts/court-settings";
export async function getCourtConfiguration(arenaId:string){const origin=process.env.VX4_BACKEND_ORIGIN;return origin?readBackendContract(origin,'/api/management/court-settings',courtConfigurationSchema,{cookie:await managementCookieHeader()??''},{timeoutMs:60000}):(await import('@/lib/backend/services/court-settings-data')).resolveCourtConfiguration(arenaId);}
