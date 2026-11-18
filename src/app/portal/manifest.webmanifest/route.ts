import { athletePortalManifest, portalPwaEnabled } from "@/lib/portal/pwa-policy";

export const dynamic = "force-dynamic";

export function GET() {
  if (!portalPwaEnabled()) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return Response.json(athletePortalManifest(), { headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "no-store" } });
}
