import assert from "node:assert/strict";
import test from "node:test";
import { registrationArenaSlug } from "../src/lib/portal/registration-arena";

test("registration accepts the existing arena portal and booking link formats", () => {
  for (const input of ["arena-teste", "/classificacao/arena-teste", "https://example.test/home?arena=arena-teste", "https://example.test/arena-teste/portaldoatleta/agendamento", "/reservar/arena-teste", "/checkin/arena-teste?token=ignored"]) {
    assert.equal(registrationArenaSlug(input), "arena-teste");
  }
});
test("registration rejects empty identifiers, generic routes, scripts and malformed links", () => {
  for (const input of ["", "https://example.test", "/portal", "/home", "/home?arena=", "javascript:alert(1)", "https://[", "/classificacao/a%2Fb", "https://example.test/unrelated/path"]) {
    assert.equal(registrationArenaSlug(input), null, input);
  }
});
