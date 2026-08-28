import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { closeExpiredLeagueCycles } from "@/lib/league/lifecycle";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = env.cronSecret;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const cycles = await closeExpiredLeagueCycles();
    return NextResponse.json({ ok: true, cycles });
  } catch (error) {
    console.error("League monthly close failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
