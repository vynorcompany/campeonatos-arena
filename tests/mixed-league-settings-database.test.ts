import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
import { isCategoryGender } from "../src/lib/tournament-category/options";
import { arenaDatabaseForTest } from "./helpers/arena-database";
import { parseReaisToCents } from "../src/lib/tournaments/inputs";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = /^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("Editar Liga salva Mista com RLS, preserva atletas e impede editar outra arena", { skip: !enabled }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime"; runtimeUrl.password = "fixture";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const arenas: string[] = [];
  let arenaId = "";
  const actions: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/actions/category-competition.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports: actions, FormData, Error,
    require(name: string) {
      if (name === "@/lib/auth/guards") return { requirePermission: async () => ({ arenaId }) };
      if (name === "@/lib/tournament-category/options") return { isCategoryGender };
      if (name === "@/lib/tournaments/inputs") return { parseReaisToCents };
      if (name === "next/cache") return { revalidatePath() {} };
      if (name === "@/lib/prisma") return { prisma: runtime };
      if (name === "@/lib/rls") return { withArenaTransaction: (id: string, callback: any) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${id}, true)`; return callback(tx); }) };
      return {};
    },
  });
  const page: { default?: (props: any) => Promise<any> } = {};
  vm.runInNewContext(ts.transpileModule(readFileSync("src/app/(app)/torneios/[tournamentId]/categorias/nova/page.tsx", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports: page,
    require(name: string) {
      if (name === "@/lib/auth/guards") return { requireModuleView: async () => ({ arenaId }) };
      if (name === "@/lib/permissions") return { canPerformPermission: () => true };
      if (name === "@/lib/arena-database") return { arenaDatabase: (id: string) => arenaDatabaseForTest(runtime, id) };
      if (name === "next/navigation") return { notFound() { throw new Error("NAO_ENCONTRADO"); }, redirect() { throw new Error("SEM_PERMISSAO"); } };
      if (name === "react/jsx-runtime") return { jsx: (type: any, props: any) => ({ type, props }), jsxs: (type: any, props: any) => ({ type, props }) };
      if (name === "./page.utilities") return { viewStyles: {} };
      return {};
    },
  });
  try {
    for (let index = 0; index < 2; index++) arenas.push((await admin.arena.create({ data: { name: "Liga Mista QA", slug: "mixed-settings-" + randomUUID(), createdById: "goal-test" } })).id);
    arenaId = arenas[0];
    const event = await admin.tournament.create({ data: { arenaId, name: "Liga Mista QA" } });
    assert.ok(await page.default!({ params: Promise.resolve({ tournamentId: event.id }) }));
    arenaId = arenas[1];
    await assert.rejects(() => page.default!({ params: Promise.resolve({ tournamentId: event.id }) }), /NAO_ENCONTRADO/);
    arenaId = arenas[0];
    const category = await admin.tournamentCategory.create({ data: { tournamentId: event.id, name: "Liga QA", level: 1, class: "5ª", gender: "FEMININO", competition: { create: { format: "LEAGUE", leagueTier: "A" } } }, include: { competition: true } });
    const players = await Promise.all(["Feminino", "Masculino"].map((gender, index) => admin.player.create({ data: { arenaId, name: `Mista QA ${index}`, gender } })));
    await admin.categoryPair.create({ data: { competitionId: category.competition!.id, name: "Dupla QA", players: { create: players.map((player, index) => ({ playerId: player.id, slot: index + 1 })) } } });
    const form = new FormData();
    for (const [key, value] of Object.entries({ categoryId: category.id, name: "Liga Mista QA", class: "5ª", gender: "MISTA", leagueTier: "A", registrationFee: "75,00" })) form.set(key, value);
    await actions.updateLeagueCategoryAction(form);
    assert.equal((await admin.tournamentCategory.findUniqueOrThrow({ where: { id: category.id } })).gender, "MISTA");
    assert.equal((await admin.categoryCompetition.findUniqueOrThrow({ where: { id: category.competition!.id } })).registrationFeeCents, 7500);
    assert.equal(await admin.categoryPairPlayer.count({ where: { pair: { competitionId: category.competition!.id } } }), 2);
    assert.equal(await admin.leagueAthleteTier.count({ where: { arenaId, active: true, tier: "A" } }), 2);
    arenaId = arenas[1]; form.set("gender", "MASCULINO");
    await assert.rejects(() => actions.updateLeagueCategoryAction(form), /não encontrada/);
    assert.equal((await admin.tournamentCategory.findUniqueOrThrow({ where: { id: category.id } })).gender, "MISTA");
  } finally {
    await admin.tournament.deleteMany({ where: { arenaId: { in: arenas } } });
    await admin.player.deleteMany({ where: { arenaId: { in: arenas } } });
    await admin.arena.deleteMany({ where: { id: { in: arenas } } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
