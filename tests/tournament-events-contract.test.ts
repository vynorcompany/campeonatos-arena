import assert from "node:assert/strict";
import test from "node:test";
import { tournamentEventFields, tournamentEventInputSchema, tournamentEventOutcomeSchema, tournamentEventPayload, tournamentCreateOptionsSchema } from "../src/lib/backend/contracts/tournament-events";
test("event mutations admit only operation-specific scalar fields and preserve absent checkbox sentinels", () => {
 for (const op of Object.keys(tournamentEventFields) as Array<keyof typeof tournamentEventFields>) {
  assert.ok(tournamentEventInputSchema(op).safeParse({}).success);
  for (const key of ["arenaId", "userId", "actorId", "systemRole", "passwordHash"]) assert.equal(tournamentEventInputSchema(op).safeParse({ [key]: "forged" }).success, false);
 }
 assert.equal(tournamentEventInputSchema("finish").safeParse({ status: "FINISHED" }).success, false);
 const form = new FormData(); form.set("name", "Evento"); form.set("arenaId", "forged");
 assert.deepEqual(tournamentEventPayload("update", form), { name: "Evento" });
 form.set("onlinePaymentEnabledPresent", "true"); assert.equal(tournamentEventPayload("update", form).onlinePaymentEnabledPresent, "true");
 form.append("name", "Duplicado"); assert.throws(() => tournamentEventPayload("update", form));
 form.delete("name"); form.set("name", new File(["x"], "name.txt")); assert.throws(() => tournamentEventPayload("update", form));
});
test("event outcomes cannot redirect/cache arbitrary paths or expose extra records", () => {
 const valid = { state: { error: null, success: "Criado", tournamentId: "event" }, refresh: true, paths: [{ path: "/torneios/event" }, { path: "/inscricao/[slug]", type: "page" }], redirect: "/torneios/event/categorias/category" };
 assert.ok(tournamentEventOutcomeSchema.safeParse(valid).success);
 for (const redirect of ["https://evil.test", "//evil.test", "/login", "/torneios/../categorias/..", "/torneios/a/categorias/b?next=evil", "/torneios/a/categorias/b\\evil"]) assert.equal(tournamentEventOutcomeSchema.safeParse({ ...valid, redirect }).success, false);
 assert.equal(tournamentEventOutcomeSchema.safeParse({ ...valid, paths: [{ path: "/agencia" }] }).success, false);
 assert.equal(tournamentEventOutcomeSchema.safeParse({ ...valid, providerToken: "private" }).success, false);
 assert.equal(tournamentCreateOptionsSchema.safeParse({ rankings: [{ id: "r", name: "Ranking", arenaId: "private" }] }).success, false);
});
