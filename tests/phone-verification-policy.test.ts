import assert from "node:assert/strict";
import test from "node:test";
import { requiresPhoneVerification } from "../src/lib/auth/phone-verification-policy";

test("public production registration cannot disable phone ownership verification", () => {
  for (const appUrl of [undefined, "", "invalid", "https://arena.example", "https://localhost.evil", "http://127.0.0.1.evil", "ftp://localhost"]) {
    assert.equal(requiresPhoneVerification({ configured: false, production: true, appUrl }), true, String(appUrl));
  }
});

test("only exact loopback URLs permit explicit local production QA without messages", () => {
  for (const appUrl of ["http://localhost:3015", "http://127.0.0.1:3015", "http://[::1]:3015"]) {
    assert.equal(requiresPhoneVerification({ configured: false, production: true, appUrl }), false);
    assert.equal(requiresPhoneVerification({ configured: true, production: true, appUrl }), true);
  }
  assert.equal(requiresPhoneVerification({ configured: false, production: false }), false);
  assert.equal(requiresPhoneVerification({ configured: true, production: false }), true);
});
