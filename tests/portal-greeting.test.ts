import assert from "node:assert/strict";
import { test } from "node:test";
import { getPortalGreeting } from "../src/lib/portal/greeting";

test("saudação acompanha manhã, tarde e noite no horário de Brasília", () => {
  assert.equal(getPortalGreeting(new Date("2026-10-08T11:00:00Z")), "Bom dia");
  assert.equal(getPortalGreeting(new Date("2026-10-08T18:00:00Z")), "Boa tarde");
  assert.equal(getPortalGreeting(new Date("2026-10-08T23:00:00Z")), "Boa noite");
  assert.equal(getPortalGreeting(new Date("2026-10-08T07:00:00Z")), "Boa noite");
});
