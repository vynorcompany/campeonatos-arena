import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const revision = process.env.RAILWAY_GIT_COMMIT_SHA?.match(/^[a-f0-9]{40}$/i)?.[0].slice(0, 12) ?? null;
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        ok: true,
        service: "campeonatos-padel",
        revision,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Healthcheck failed", error);

    return NextResponse.json(
      {
        ok: false,
        service: "campeonatos-padel",
        revision,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
