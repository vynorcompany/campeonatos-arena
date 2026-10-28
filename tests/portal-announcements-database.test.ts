import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { arenaDatabaseForTest } from "./helpers/arena-database";
import { instantToArenaWallClock } from "../src/lib/calendar/arena-wall-clock";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = (() => { try { const value = new URL(url); return value.hostname === "127.0.0.1" && value.port === "55433" && value.pathname === "/arena_goal"; } catch { return false; } })();
test("announcement feed paginates pinned posts without duplicates and enforces visibility, authentication and arena isolation", { skip: !enabled }, async () => {
 const admin = new PrismaClient({ datasources: { db: { url } } }); const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime"; const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
 const arenaIds: string[] = [];
 try {
  const arena = await admin.arena.create({ data: { name: "Feed QA", slug: `feed-${randomUUID()}`, createdById: "goal-test" } }); arenaIds.push(arena.id);
  const other = await admin.arena.create({ data: { name: "Other Feed QA", slug: `feed-other-${randomUUID()}`, createdById: "goal-test" } }); arenaIds.push(other.id);
  const createdAt = new Date();
  const posts = await Promise.all(Array.from({ length: 28 }, (_, index) => admin.portalAnnouncement.create({ data: { arenaId: arena.id, title: `Post ${index}`, message: "Aviso", pinned: index < 2, createdAt } })));
  const foreign = await admin.portalAnnouncement.create({ data: { arenaId: other.id, title: "Foreign", message: "Private" } });
  const now = instantToArenaWallClock(new Date());
  await admin.portalAnnouncement.createMany({ data: [
   { arenaId: arena.id, title: "Inactive", message: "Hidden", active: false },
   { arenaId: arena.id, title: "Future", message: "Hidden", startsAt: new Date(now.getTime()+86400000) },
   { arenaId: arena.id, title: "Expired", message: "Hidden", endsAt: new Date(now.getTime()-86400000) },
  ] });
  const exports: { GET?: (request: Request) => Promise<Response> } = {};
  const mocks: Record<string, unknown> = {
   "@/lib/auth/player-session": { getPublicPlayerAuth: async (slug: string) => slug === arena.slug ? { arenaId: arena.id } : null },
   "@/lib/arena-database": { arenaDatabase: (id: string) => arenaDatabaseForTest(runtime,id) },
   "@/lib/calendar/arena-wall-clock": { instantToArenaWallClock },
  };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/app/api/public/announcements/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Date, URL, Response, require: (name: string) => mocks[name] ?? {} });
  const request = (slug: string, cursor?: string) => exports.GET!(new Request(`http://localhost/api/public/announcements?${new URLSearchParams({arena:slug,...cursor?{cursor}:{}})}`));
  assert.equal((await request(other.slug)).status,401);
  assert.equal((await request(arena.slug,foreign.id)).status,400);
  const firstResponse = await request(arena.slug); assert.equal(firstResponse.headers.get("Cache-Control"),"private, no-store");
  const first = await firstResponse.json(); const second = await (await request(arena.slug,first.nextCursor)).json(); const third = await (await request(arena.slug,second.nextCursor)).json();
  assert.deepEqual([first.items.length,second.items.length,third.items.length],[12,12,4]); assert.equal(third.nextCursor,null);
  const all = [...first.items,...second.items,...third.items]; assert.equal(new Set(all.map(item=>item.id)).size,28);
  assert.deepEqual(new Set(all.map(item=>item.id)),new Set(posts.map(item=>item.id)));
  assert(all.slice(0,2).every(item=>item.pinned)); assert(all.slice(2).every(item=>!item.pinned));
 } finally { await admin.arena.deleteMany({where:{id:{in:arenaIds}}}); await runtime.$disconnect(); await admin.$disconnect(); }
});
