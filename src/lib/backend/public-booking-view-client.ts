import "server-only";
import { cookies } from "next/headers";
import { backendOrigin } from "./http-client";
import { publicBookingViewInputSchema, publicBookingViewSchema } from "./contracts/public-booking-view";
export async function getPublicBookingView(input: { arenaSlug: string; date?: string; matchId?: string }) {
  const parsed = publicBookingViewInputSchema.safeParse(input);
  if (!parsed.success) return null;
  const origin = process.env.VX4_BACKEND_ORIGIN;
  if (!origin) return (await import("./services/public-booking-view")).resolvePublicBookingView(parsed.data);
  const token = (await cookies()).get("arena_player_session")?.value;
  const query = new URLSearchParams(parsed.data);
  const response = await fetch(new URL(`/api/portal/booking-view?${query}`, backendOrigin(origin)), {
    headers: { Accept: "application/json", ...(token ? { cookie: `arena_player_session=${encodeURIComponent(token)}` } : {}) },
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Não foi possível consultar os horários. Tente novamente.");
  return publicBookingViewSchema.parse(await response.json());
}
