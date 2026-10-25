import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { expirePortalCheckouts } from "@/lib/payments/portal-checkout-expiry";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = env.cronSecret;
  const supplied = request.headers.get("x-cron-secret") ?? request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || Buffer.byteLength(secret) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await expirePortalCheckouts();
  return NextResponse.json({ ok: result.failed === 0, ...result }, { status: result.failed ? 500 : 200 });
}
