import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        ok: true,
        service: "campeonatos-padel",
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
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
