import { createHash } from "node:crypto";
import { getPublicPlayerAuth } from "@/lib/auth/player-session";
import { getPublicClientComandas } from "@/lib/services/public-client-home";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("arenaSlug")?.trim();
  if (!slug || slug.length > 160) return Response.json({ error: "Arena inválida." }, { status: 400 });
  const auth = await getPublicPlayerAuth(slug);
  if (!auth) return Response.json({ error: "Não autenticado." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const data = await getPublicClientComandas(slug, auth.playerId, { catalog: false });
  if (!data) return Response.json({ error: "Arena indisponível." }, { status: 404 });
  const snapshot = { disabled: data.disabled, comandas: data.comandas };
  const etag = `"${createHash("sha256").update(JSON.stringify(snapshot)).digest("hex")}"`;
  const headers = { "Cache-Control": "private, no-store", ETag: etag };
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return Response.json(snapshot, { headers });
}
