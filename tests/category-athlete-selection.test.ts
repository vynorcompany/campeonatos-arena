import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts: string[]) => readFileSync(path.join(root, ...parts), "utf8");

test("manual category registration selects two master athletes", () => {
  const form = read("src", "components", "forms", "tournament-participants-form.tsx");
  const tabs = read("src", "components", "tournaments", "tournament-detail-tabs.tsx");

  assert.match(form, /name="leadPlayerId"/);
  assert.match(form, /name="partnerPlayerId"/);
  assert.match(form, /<option[^>]+value=\{player\.id\}>\{player\.name\}<\/option>/);
  assert.match(tabs, /players=\{tournament\.arena\.players\.map/);
});

test("master athletes retain the registration data required by categories", () => {
  const schema = read("prisma", "schema.prisma");
  const athleteForm = read("src", "components", "forms", "player-form.tsx");

  assert.match(schema, /phone\s+String/);
  assert.match(schema, /cpf\s+String/);
  assert.match(schema, /birthDate\s+DateTime\?/);
  assert.match(athleteForm, /name="phone"/);
  assert.match(athleteForm, /name="cpf"/);
  assert.match(athleteForm, /name="birthDate"/);
});

test("manual category registration rejects the same athlete twice", () => {
  const validator = read("src", "lib", "validators", "public-registration.ts");
  const action = read("src", "lib", "actions", "tournament.ts");

  assert.match(validator, /leadPlayerId: z\.string\(\)\.trim\(\)\.min\(1/);
  assert.match(validator, /partnerPlayerId: z\.string\(\)\.trim\(\)\.min\(1/);
  assert.match(action, /leadPlayerId === parsed\.data\.partnerPlayerId/);
  assert.match(action, /Os atletas da dupla devem ser diferentes/);
  assert.match(action, /active: true/);
});
