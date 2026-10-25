import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
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
