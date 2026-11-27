import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "./helpers/domain-source";
import ts from "typescript";
import { z } from "zod";
import { normalizeBrazilianPhone } from "../src/lib/phone";

test("forged profile phone changes cannot mutate access identifiers or bypass contact review", async () => {
  let photoReads = 0, mutations = 0;
  const db = {
    playerAccount: { findFirst: async (args: any) => {
      assert.deepEqual(JSON.parse(JSON.stringify(args.where)), { id: "own-account", arenaId: "own-arena", playerId: "own-player" });
      return { phone: "11988887777" };
    } },
    $transaction: async () => { mutations++; },
  };
  const mocks: Record<string, unknown> = {
    "next/cache": { revalidatePath() {} }, zod: { z },
    "@/lib/auth/player-session": { requirePublicPlayerAuth: async () => ({ playerId: "own-player", playerAccountId: "own-account", arenaId: "own-arena" }) },
    "@/lib/arena-database": { arenaDatabase: () => db },
    "@/lib/uploads": { toPersistentPlayerPhoto: async () => { photoReads++; return null; } },
    "@/lib/phone": { normalizeBrazilianPhone },
  };
  const actions: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/public-player-profile.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: actions, FormData, Date, require: (name: string) => { if (!(name in mocks)) throw new Error(`Unexpected import ${name}`); return mocks[name]; } });
  const form = new FormData();
  for (const [key, value] of Object.entries({ arenaSlug: "own-arena", name: "Own Person", phone: "11900000000", email: "", bio: "", birthDate: "", gender: "", padelSide: "" })) form.set(key, value);
  const state = await actions.updatePublicPlayerProfileAction({}, form);
  assert.match(state.error, /verificação do novo número/);
  assert.equal(photoReads, 0); assert.equal(mutations, 0);
});

test("profile rejects impossible and future birth dates before reading or changing an account", async () => {
  let accountReads = 0;
  const mocks: Record<string, unknown> = {
    "next/cache": { revalidatePath() {} }, zod: { z },
    "@/lib/auth/player-session": { requirePublicPlayerAuth: async () => { accountReads++; throw new Error("Invalid data must not reach authentication"); } },
    "@/lib/arena-database": { arenaDatabase() { throw new Error("Invalid data must not reach storage"); } },
    "@/lib/uploads": { toPersistentPlayerPhoto() {} },
    "@/lib/phone": { normalizeBrazilianPhone },
  };
  const actions: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/public-player-profile.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: actions, FormData, Date, require: (name: string) => mocks[name] });
  for (const birthDate of ["2025-02-29", "2026-04-31", "2099-01-01", "30/01/2000", "not-a-date"]) {
    const form = new FormData();
    for (const [key, value] of Object.entries({ arenaSlug: "own-arena", name: "Own Person", phone: "11988887777", email: "", bio: "", birthDate, gender: "", padelSide: "" })) form.set(key, value);
    const state = await actions.updatePublicPlayerProfileAction({}, form);
    assert.match(state.error, /data de nascimento válida/);
    assert.equal(state.success, null);
  }
  assert.equal(accountReads, 0);
});

test("profile saves normalized names and valid leap dates only to the authenticated player", async () => {
  const updates: any[] = [];
  const tx = {
    player: { update: async (args: any) => { updates.push(args); } },
    student: { findFirst: async () => null },
    teacher: { findUnique: async () => null },
  };
  const mocks: Record<string, unknown> = {
    "next/cache": { revalidatePath() {} }, zod: { z },
    "@/lib/auth/player-session": { requirePublicPlayerAuth: async () => ({ playerId: "own-player", playerAccountId: "own-account", arenaId: "own-arena" }) },
    "@/lib/arena-database": { arenaDatabase: (arenaId: string) => {
      assert.equal(arenaId, "own-arena");
      return { playerAccount: { findFirst: async (args: any) => args.where.id ? { phone: "11988887777" } : null }, $transaction: async (run: any) => run(tx) };
    } },
    "@/lib/uploads": { toPersistentPlayerPhoto: async () => null },
    "@/lib/phone": { normalizeBrazilianPhone },
  };
  const actions: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/public-player-profile.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: actions, FormData, Date, require: (name: string) => mocks[name] });
  for (const birthDate of ["2000-02-29", ""]) {
    const form = new FormData();
    for (const [key, value] of Object.entries({ arenaSlug: "own-arena", playerId: "other-player", name: "  Own   Person  ", phone: "(11) 98888-7777", email: " own@example.com ", bio: "Biography", birthDate, gender: "", padelSide: "BOTH" })) form.set(key, value);
    form.append("padelCategory", "6ª categoria");
    const state = await actions.updatePublicPlayerProfileAction({}, form);
    assert.equal(state.error, null);
    const saved = updates.at(-1);
    assert.equal(saved.where.id, "own-player");
    assert.equal(saved.data.name, "Own Person");
    assert.equal(saved.data.email, "own@example.com");
    assert.equal(saved.data.phone, "11988887777");
    assert.equal(saved.data.birthDate?.toISOString() ?? null, birthDate ? "2000-02-29T00:00:00.000Z" : null);
    assert.equal(saved.data.padelCategories, '["6ª categoria"]');
  }
});
