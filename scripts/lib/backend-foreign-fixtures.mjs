import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Each HTTP case owns its foreign parent. Concurrent database tests may create
// and remove other arenas, so selecting an arbitrary existing parent is unsafe.
const owned = new WeakMap();
export async function createForeignArenaFixture(db, label) {
  const arena = await db.arena.create({ data: { name: 'Foreign contract fixture ' + label, slug: 'backend-foreign-' + randomUUID(), createdById: 'goal-test' }, select: { id: true, slug: true } });
  const rows = owned.get(db) ?? [];
  rows.push(arena); owned.set(db, rows);
  return arena;
}
export async function cleanupForeignArenaFixtures(db) {
  for (const arena of [...(owned.get(db) ?? [])].reverse()) {
    const stored = await db.arena.findUniqueOrThrow({ where: { id: arena.id }, select: { slug: true, createdById: true } });
    assert.equal(stored.slug, arena.slug); assert.equal(stored.createdById, 'goal-test');
    await db.auditEvent.deleteMany({ where: { arenaId: arena.id } });
    await db.arena.delete({ where: { id: arena.id, slug: arena.slug, createdById: 'goal-test' } });
  }
  owned.delete(db);
}
