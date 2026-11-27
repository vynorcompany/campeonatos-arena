import "server-only";
import {cookies} from "next/headers";
import {backendOrigin,readBackendContract} from "@/lib/backend/http-client";
import {managementCookieHeader} from "@/lib/backend/management-context-client";
import {checkinViewInputSchema,checkinViewSchema,checkinSettingsSchema} from "@/lib/backend/contracts/checkin";
export async function getCheckinView(input:{arenaSlug:string;token:string;focusId:string}) {
 const parsed=checkinViewInputSchema.safeParse(input);if(!parsed.success)return null;const origin=process.env.VX4_BACKEND_ORIGIN;
 if(!origin)return(await import("@/lib/backend/services/checkin-view")).resolveCheckinView(parsed.data.arenaSlug,parsed.data.token,parsed.data.focusId);
 const token=(await cookies()).get("arena_player_session")?.value;
 const response=await fetch(new URL(`/api/portal/checkin?${new URLSearchParams(parsed.data)}`,backendOrigin(origin)),{headers:{Accept:"application/json",...(token?{cookie:`arena_player_session=${encodeURIComponent(token)}`}:{})},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(30000)});
 if(response.status===404)return null;if(!response.ok)throw Error("Não foi possível consultar o check-in.");return checkinViewSchema.parse(await response.json());
}
export async function getCheckinSettings(arenaId:string){const origin=process.env.VX4_BACKEND_ORIGIN;if(origin)return readBackendContract(origin,"/api/management/checkin",checkinSettingsSchema,{cookie:(await managementCookieHeader())??""});const{arenaDatabase}=await import("@/lib/arena-database");const{operationalSettings,...arena}=await arenaDatabase(arenaId).arena.findUniqueOrThrow({where:{id:arenaId},select:{slug:true,checkinEnabled:true,checkinMode:true,checkinToken:true,operationalSettings:{select:{lessonCheckinBlockOverdue:true}}}});return checkinSettingsSchema.parse({...arena,blockOverdueLessons:operationalSettings?.lessonCheckinBlockOverdue??false});}
