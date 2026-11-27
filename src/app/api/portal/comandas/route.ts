import {readPortalComandasLive} from "@/lib/portal/comandas-live-gateway";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const origin=process.env.VX4_BACKEND_ORIGIN;
 if(origin)return readPortalComandasLive(request,origin);
 // Temporary compatibility for the unified deployment; no fallback after a remote failure.
 return (await import("@/lib/backend/services/portal-comandas-live")).GET(request);
}
