import assert from "node:assert/strict";
import test from "node:test";
import { createPlayerSchema } from "../src/lib/validators/player";
import { createArenaUserSchema } from "../src/lib/validators/user";

test("requires a surname when creating an athlete", () => {
  const base = { points: 0, class: "", gender: "", phone: "", email: "", cpf: "", addressZipCode: "", addressStreet: "", addressNumber: "", addressNeighborhood: "", addressCity: "", addressState: "", birthDate: null, leagueTier: "", isTeacher: false };
  assert.equal(createPlayerSchema.safeParse({ ...base, name: "Maria" }).success, false);
  assert.equal(createPlayerSchema.safeParse({ ...base, name: "Maria Silva" }).success, true);
});

test("requires a surname when creating a system user", () => {
  const base = { email: "maria@arena.test", password: "senha-segura", arenaRole: "STAFF" as const, viewPermissions: [], editPermissions: [] };
  assert.equal(createArenaUserSchema.safeParse({ ...base, name: "Maria" }).success, false);
  assert.equal(createArenaUserSchema.safeParse({ ...base, name: "Maria Silva" }).success, true);
});
