import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export function hashAccountToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createAccountToken(data: { kind: "INVITE" | "RESET"; email: string; name?: string; arenaId?: string; userId?: string; profileId?: string; arenaRole?: string; hoursValid: number }) {
  const token = crypto.randomBytes(32).toString("hex");
  const record = await prisma.accountActionToken.create({ data: {
    tokenHash: hashAccountToken(token), kind: data.kind, email: data.email,
    name: data.name ?? "", arenaId: data.arenaId, userId: data.userId,
    profileId: data.profileId, arenaRole: data.arenaRole ?? "STAFF",
    expiresAt: new Date(Date.now() + data.hoursValid * 3_600_000)
  } });
  return { token, record };
}
