import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("inserção manual de dupla exibe erros da ação sem derrubar a categoria", () => {
  const component = readFileSync(resolve(process.cwd(), "src/components/tournaments/category-registration-panel.tsx"), "utf8");

  assert.match(component, /import \{ SafeActionForm \} from "@\/components\/forms\/safe-action-form"/);
  assert.match(component, /<SafeActionForm action=\{addManualPairAction\} className="grid-form"/);
  assert.doesNotMatch(component, /<form action=\{addManualPairAction\} className="grid-form"/);
});
