import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const workspaceRoot = process.cwd();

test("ranking index renders summary rows and an open action", () => {
  const source = readFileSync(
    path.join(workspaceRoot, "src", "components", "tournaments", "ranking-list.tsx"),
    "utf8",
  );

  assert.match(source, /Abrir/);
  assert.doesNotMatch(source, /Salvar ranking/);
});

test("new ranking has a dedicated route", () => {
  assert.ok(
    existsSync(
      path.join(workspaceRoot, "src", "app", "(app)", "torneios", "rankings", "novo", "page.tsx"),
    ),
  );
});

test("create form redirects to the newly created ranking", () => {
  const source = readFileSync(
    path.join(workspaceRoot, "src", "components", "forms", "ranking-create-form.tsx"),
    "utf8",
  );

  assert.match(source, /router\.push\(`\/torneios\/rankings\/\$\{rankingId\}`\)/);
});
