import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/lib/auth/player-session.ts", import.meta.url), "utf8");

function fixture(expired = false) {
  let reads = 0;
  let deletions = 0;
  let playerReads = 0;
  const account = { id: "account-a", arenaId: "arena-a", playerId: "player-a", phone: "11999990000", identityId: null };
  const player = {
    id: "player-a", arenaId: "arena-a", active: true, name: "Atleta A", phone: account.phone,
    email: "", photoUrl: "", bio: "", birthDate: null, gender: "", padelCategories: "[]",
    class: "", padelSide: "", tournamentAvailability: "OFF", teacher: null,
    addressCity: "", addressState: "",
    arena: { slug: "arena-a", name: "Arena A", logoUrl: "", city: "", state: "" },
  };
  const session = {
    id: "session-a", expiresAt: new Date(Date.now() + (expired ? -60_000 : 60_000)),
    athleteIdentityId: null, playerAccount: account,
  };
  const prisma = {
    playerSession: {
      findFirst: async () => { reads += 1; return session; },
      deleteMany: async () => { deletions += 1; return { count: deletions === 1 ? 1 : 0 }; },
    },
  };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  const mocks: Record<string, unknown> = {
    "server-only": {},
    "next/headers": { cookies: async () => ({ get: () => ({ value: "test-session-token" }) }) },
    "@/lib/prisma": { prisma },
    "@/lib/arena-database": { arenaDatabase: (arenaId: string) => ({ player: { findFirst: async () => {
      assert.equal(arenaId, "arena-a");
      playerReads += 1;
      return player;
    } } }) },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText, { exports, Date, process, require: (name: string) => name in mocks ? mocks[name] : require(name) });
  return { exports, get reads() { return reads; }, get deletions() { return deletions; }, get playerReads() { return playerReads; } };
}

test("portal resolves athlete and arena access from one session lookup", async () => {
  const state = fixture();
  const result = await state.exports.getPublicPlayerContext("arena-a");
  assert.equal(result.currentClient?.playerId, "player-a");
  assert.deepEqual(Array.from(result.athleteIdentity?.arenas ?? [], (arena: { slug: string }) => arena.slug), ["arena-a"]);
  assert.equal(state.reads, 1);
  assert.equal(state.playerReads, 1);

  const otherArena = await state.exports.getPublicPlayerContext("arena-b");
  assert.equal(otherArena.currentClient, null);
  assert.equal(state.reads, 2);
});

test("concurrent reads of an expired athlete session clean up idempotently", async () => {
  const state = fixture(true);
  const [auth, identity] = await Promise.all([
    state.exports.getPublicPlayerAuth("arena-a"),
    state.exports.getPublicAthleteIdentity(),
  ]);
  assert.equal(auth, null);
  assert.equal(identity, null);
  assert.equal(state.reads, 2);
  assert.equal(state.deletions, 2);
  assert.equal(state.playerReads, 0);
});
