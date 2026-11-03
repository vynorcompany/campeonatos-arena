import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readBoundedJson } from "@/lib/http/json-body";

const reportSchema = z.object({ kind: z.enum(["independent-copy", "wal-archive", "pitr-drill"]), ok: z.boolean() });
export async function POST(request: Request) {
  const secret = process.env.RECOVERY_MONITOR_SECRET ?? "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (secret.length < 32 || Buffer.byteLength(supplied) !== Buffer.byteLength(secret) || !timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  let parsed;
  try { parsed = reportSchema.safeParse(await readBoundedJson(request, 4096)); }
  catch { return NextResponse.json({ error: "Relatório inválido." }, { status: 400 }); }
  if (!parsed.success) return NextResponse.json({ error: "Relatório inválido." }, { status: 400 });
  const { kind, ok } = parsed.data;
  const now = new Date();
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"recovery-monitor:" + kind}, 0))`;
    const previous = await tx.recoveryCheck.findUnique({ where: { id: kind } });
    await tx.recoveryCheck.upsert({ where: { id: kind }, create: { id: kind, status: ok ? "OK" : "FAILED", checkedAt: now, lastSuccessAt: ok ? now : null, errorCode: ok ? "" : kind }, update: { status: ok ? "OK" : "FAILED", checkedAt: now, ...(ok ? { lastSuccessAt: now } : {}), errorCode: ok ? "" : kind } });
    if (!ok && previous?.status !== "FAILED") {
      console.error("[recovery-monitor] Recovery check failed", { kind });
    }
  });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
