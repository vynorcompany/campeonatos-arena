import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("main can only receive releases from the staging branch", () => {
  const workflow = resolve(process.cwd(), ".github", "workflows", "require-staging-promotion.yml");

  assert.ok(existsSync(workflow), "staging promotion workflow is missing");
  const contents = readFileSync(workflow, "utf8");
  assert.match(contents, /pull_request_target:/);
  assert.match(contents, /branches:\s*\[main\]/);
  assert.match(contents, /SOURCE_BRANCH: \$\{\{ github\.head_ref \}\}/);
  assert.match(contents, /test "\$SOURCE_BRANCH" = "staging"/);
});
