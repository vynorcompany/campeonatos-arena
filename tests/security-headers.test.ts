import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("production responses declare the baseline browser security headers", () => {
  const config = readFileSync(resolve(process.cwd(), "next.config.mjs"), "utf8");

  for (const header of ["Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"]) {
    assert.match(config, new RegExp(header));
  }
  const policy = readFileSync(resolve(process.cwd(), "src/lib/security/content-security-policy.mjs"), "utf8");
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /media-src 'self' blob: https:/);
});
