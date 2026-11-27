import { NextRequest, NextResponse } from "next/server";
import { publicBookingViewInputSchema } from "@/lib/backend/contracts/public-booking-view";
import { resolvePublicBookingView } from "@/lib/backend/services/public-booking-view";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  const query = request.nextUrl.searchParams;
  const parsed = publicBookingViewInputSchema.safeParse(Object.fromEntries(query));
  if (!parsed.success || [...query.keys()].some(key => query.getAll(key).length !== 1)) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers });
  const result = await resolvePublicBookingView(parsed.data);
  if (!result) return NextResponse.json({ error: "Arena não encontrada." }, { status: 404, headers });
  return NextResponse.json(result, { headers });
}
