import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("jogos da categoria oferecem status Agendado, Em andamento e Finalizado", async () => {
  const panel = await readFile(
    path.join(
      workspaceRoot,
      "src",
      "components",
      "tournaments",
      "category-results-panel.tsx",
    ),
    "utf8",
  );

  assert.match(panel, /updateCategoryMatchStatusAction/);
  assert.match(panel, /value="SCHEDULED"/);
  assert.match(panel, /value="LIVE"/);
  assert.match(panel, /value="FINISHED"/);
});
