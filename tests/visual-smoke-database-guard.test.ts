import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("visual reproduction opt-in cannot target production, arbitrary local databases or mismatched URLs", () => {
  const cases = [
    { url: "postgresql://postgres@production.invalid:5432/arena_goal?schema=public", local: "true" },
    { url: "postgresql://postgres@127.0.0.1:55433/arena_real?schema=public", local: "true" },
    { url: "postgresql://postgres@127.0.0.1:55433/arena_goal_visual?schema=public", local: "false" },
    { url: "postgresql://arena_runtime@127.0.0.1:55433/arena_goal_visual?schema=public", local: "true" },
    { url: "postgresql://postgres@127.0.0.1:55433/arena_goal_visual?schema=public", local: "true", different: true },
  ];
  for (const sample of cases) {
    const env = { ...process.env, GITHUB_ACTIONS: "false", ARENA_VISUAL_LOCAL: sample.local, ARENA_GOAL_TEST_DATABASE_URL: sample.url, DATABASE_URL: sample.different ? "postgresql://postgres@production.invalid/arena_real" : sample.url, DIRECT_URL: sample.url, ARENA_GOAL_TEST_SESSION_TOKEN: "a".repeat(40) };
    const result = spawnSync(process.execPath, ["scripts/visual-smoke-ci.mjs"], { cwd: new URL("..", import.meta.url), env, encoding: "utf8", timeout: 5000 });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /teste visual exige o banco fictício e isolado/);
  }
});

test("the visual seed refuses other database names even with local opt-in", () => {
  for (const url of ["postgresql://postgres@production.invalid:5432/arena_goal?schema=public", "postgresql://postgres@127.0.0.1:55433/arena_real?schema=public"]) {
    const env = { ...process.env, ARENA_VISUAL_LOCAL: "true", ARENA_GOAL_TEST_DATABASE_URL: url, DATABASE_URL: url, DIRECT_URL: url, ARENA_GOAL_TEST_SESSION_TOKEN: "a".repeat(40) };
    const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/seed-goal-ci.ts"], { cwd: new URL("..", import.meta.url), env, encoding: "utf8", timeout: 5000 });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /carga de testes só pode usar o banco local descartável/);
  }
});
