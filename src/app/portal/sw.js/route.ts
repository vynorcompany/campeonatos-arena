import { portalPwaEnabled } from "@/lib/portal/pwa-policy";
import { disabledPortalPwaWorkerSource, portalPwaWorkerSource } from "@/lib/portal/pwa-worker";

export const dynamic = "force-dynamic";

export function GET() {
  return new Response(portalPwaEnabled() ? portalPwaWorkerSource() : disabledPortalPwaWorkerSource(), { headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store", "Service-Worker-Allowed": "/", "X-Content-Type-Options": "nosniff" } });
}
