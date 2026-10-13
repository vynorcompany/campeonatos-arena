import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";
  } catch { return false; }
})();

test("schema preserva a coluna legada de notas sem expô-la no cliente", () => {
  assert.match(schema, /model Player \{[\s\S]*?notes\s+String\s+@default\(""\) @ignore[\s\S]*?\n\}/);
});

test("consulta padrão de atleta não retorna notas legadas", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  try {
    const player = await db.player.findFirst({ where: { arena: { slug: "arena-teste-goal" } } });
    assert.ok(player);
    assert.equal(Object.hasOwn(player, "notes"), false);
  } finally {
    await db.$disconnect();
  }
});
