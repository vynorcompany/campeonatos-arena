import "server-only";
import {managementCookieHeader} from "@/lib/backend/management-context-client";
import {readBackendContract} from "@/lib/backend/http-client";
import {agencyUsersSchema,agencyArenasSchema} from "@/lib/backend/contracts/agency-mutations";
export async function getAgencyUsers(){const origin=process.env.VX4_BACKEND_ORIGIN;return origin?readBackendContract(origin,'/api/management/agency/workspaces/users',agencyUsersSchema,{cookie:await managementCookieHeader()??''},{timeoutMs:60000}):(await import('@/lib/backend/services/agency-workspaces')).resolveAgencyUsers();}
export async function getAgencyArenas(){const origin=process.env.VX4_BACKEND_ORIGIN;return origin?readBackendContract(origin,'/api/management/agency/workspaces/arenas',agencyArenasSchema,{cookie:await managementCookieHeader()??''},{timeoutMs:60000}):(await import('@/lib/backend/services/agency-workspaces')).resolveAgencyArenas();}
