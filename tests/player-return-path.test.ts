import test from "node:test";
import assert from "node:assert/strict";
import { playerReturnPath } from "../src/lib/auth/player-return-path";
test("login retorna ao check-in do mesmo clube sem aceitar redirecionamento externo", () => {
  assert.equal(playerReturnPath("arena", "/checkin/arena?token=abc"), "/checkin/arena?token=abc");
  assert.equal(playerReturnPath("arena", "/classificacao/arena?section=booking"), "/classificacao/arena?section=booking");
  for (const path of ["https://evil.test", "//evil.test", "/\\evil.test", "/checkin/other", "/classificacao/arena-other", "/admin", "/checkin/arena/../../other"]) assert.equal(playerReturnPath("arena", path), "/reservar/arena");
});
