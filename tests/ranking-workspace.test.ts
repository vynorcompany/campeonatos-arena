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

test("ranking workspace exposes four operational tabs", () => {
  const source = readFileSync(
    path.join(workspaceRoot, "src", "components", "tournaments", "ranking-workspace-tabs.tsx"),
    "utf8",
  );

  for (const label of ["Configuração", "Pontuação", "Classificação", "Uso"]) {
    assert.match(source, new RegExp(label));
  }
});

test("configuration owns the name field", () => {
  const source = readFileSync(
    path.join(workspaceRoot, "src", "components", "forms", "ranking-configuration-form.tsx"),
    "utf8",
  );

  assert.match(source, /name="name"/);
  assert.match(source, /updateRankingConfigurationAction/);
});

test("points form follows the ranking model", () => {
  const source = readFileSync(
    path.join(workspaceRoot, "src", "components", "forms", "ranking-points-form.tsx"),
    "utf8",
  );

  assert.match(source, /model === "LEAGUE"/);
  assert.match(source, /updateRankingProfileAction/);
});

test("ranking format changes are rejected after a category competition starts", () => {
  const source = readFileSync(
    path.join(workspaceRoot, "src", "lib", "actions", "tournament.ts"),
    "utf8",
  );

  assert.match(source, /status:\s*\{\s*not:\s*"DRAFT"\s*\}/);
  assert.match(source, /não pode alterar o tipo ou o modelo/i);
});
