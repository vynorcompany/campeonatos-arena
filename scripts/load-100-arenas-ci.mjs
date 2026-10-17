import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const databaseUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const sessionToken = process.env.ARENA_GOAL_TEST_SESSION_TOKEN ?? "";
if (process.env.GITHUB_ACTIONS !== "true" ||
    process.env.DATABASE_URL !== databaseUrl ||
    process.env.DIRECT_URL !== databaseUrl ||
    !databaseUrl.startsWith("postgresql://postgres@127.0.0.1:55433/arena_goal?") ||
    !/^[a-f0-9]{40}$/i.test(sessionToken)) {
  throw new Error("A carga multiarena exige o banco fictício e isolado da CI.");
}

const db = new PrismaClient();
const baseUrl = "http://127.0.0.1:3011";
const arenaCount = 100;
const concurrency = 20;
const runId = randomUUID().slice(0, 8);
const users = Array.from({ length: arenaCount }, (_, index) => ({
  id: randomUUID(),
  name: `Operador Carga GOAL ${index + 1}`,
  email: `goal-load-${runId}-${index + 1}@example.test`,
  passwordHash: "test-only",
  systemRole: "VIEWER",
  sessionToken: randomBytes(32).toString("hex"),
}));
const arenas = Array.from({ length: arenaCount }, (_, index) => ({
  id: randomUUID(),
  name: `Arena Carga GOAL ${index + 1}`,
  slug: `goal-load-${runId}-${index + 1}`,
  createdById: users[index].id,
}));
const marker = (index) => `Receita isolada GOAL ${runId}-${index + 1}`;
const courtMarker = (index) => `Quadra isolada GOAL ${runId}-${index + 1}`;
const percentile = (values, percent) => values[Math.ceil(values.length * percent) - 1];

async function main() {
  try {
    const seeded = await db.arena.findMany({ where: { slug: { in: ["arena-teste-goal", "arena-beta-goal"] } }, select: { slug: true } });
    if (seeded.length !== 2) throw new Error("A carga exige as duas arenas fictícias da CI antes de iniciar.");
    await db.user.createMany({ data: users.map(({ sessionToken: _sessionToken, ...user }) => user) });
    await db.arena.createMany({ data: arenas });
    await db.arenaMember.createMany({ data: arenas.map((arena, index) => ({ arenaId: arena.id, userId: users[index].id, role: "OWNER" })) });
    await db.session.createMany({ data: users.map((user) => ({
      userId: user.id,
      token: createHash("sha256").update(user.sessionToken).digest("hex"),
      expiresAt: new Date(Date.now() + 60 * 60_000),
    })) });
    await db.financialEntry.createMany({ data: arenas.map((arena, index) => ({
      arenaId: arena.id,
      type: "REVENUE",
      category: "Carga de teste",
      description: marker(index),
      amountCents: 10000 + index,
      status: "PAID",
      paidAt: new Date(),
    })) });
    const courts = arenas.map((arena, index) => ({ id: randomUUID(), arenaId: arena.id, name: courtMarker(index) }));
    await db.court.createMany({ data: courts });
    await db.courtWeeklyRule.createMany({ data: courts.map((court) => ({
      courtId: court.id,
      weekday: 6,
      startsAtMinute: 420,
      endsAtMinute: 1320,
      priceCents: 10000,
    })) });

    const probes = [
      { path: "/painel", label: "dashboard", prefix: "Receita isolada" },
      { path: "/financeiro/contas-a-receber", label: "contas-a-receber", prefix: "Receita isolada" },
      { path: "/agenda?data=2026-10-17", label: "agenda", prefix: "Quadra isolada" },
    ];
    const durations = Object.fromEntries(probes.map((probe) => [probe.label, []]));
    let nextIndex = 0;
    const errors = [];
    const worker = async () => {
      while (nextIndex < arenaCount) {
        const index = nextIndex++;
        for (const probe of probes) {
          const started = performance.now();
          try {
            const response = await fetch(`${baseUrl}${probe.path}`, {
              headers: { Cookie: `padel_session=${users[index].sessionToken}; padel_arena=${arenas[index].id}` },
              signal: AbortSignal.timeout(15_000),
            });
            const html = await response.text();
            const visibleMarkers = new Set([...html.matchAll(new RegExp(`${probe.prefix} GOAL ${runId}-(\\d+)`, "g"))].map((match) => Number(match[1])));
            if (response.status !== 200 || visibleMarkers.size !== 1 || !visibleMarkers.has(index + 1)) {
              throw new Error(`HTTP ${response.status}; marcadores visíveis=${[...visibleMarkers].join(",") || "nenhum"}`);
            }
            durations[probe.label].push(performance.now() - started);
          } catch (error) {
            errors.push({ arena: index + 1, route: probe.label, message: error instanceof Error ? error.message : String(error) });
          }
        }
      }
    };
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    const summary = {
      arenas: arenaCount,
      concurrentRequests: concurrency,
      routes: Object.fromEntries(Object.entries(durations).map(([label, values]) => {
        values.sort((left, right) => left - right);
        return [label, { succeeded: values.length, p50Ms: Math.round(percentile(values, 0.5) ?? 0), p95Ms: Math.round(percentile(values, 0.95) ?? 0), maxMs: Math.round(values.at(-1) ?? 0) }];
      })),
      failed: errors.length,
    };
    console.log(`Carga multiarena: ${JSON.stringify(summary)}`);
    if (errors.length) throw new Error(`Falhas na carga ou no isolamento: ${JSON.stringify(errors.slice(0, 5))}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
