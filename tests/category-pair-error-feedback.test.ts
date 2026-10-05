import { readFileSync } from "./helpers/style-source";
import assert from "node:assert/strict";
import test from "node:test";

import { resolve } from "node:path";

test("inserção manual de dupla exibe erros da ação sem derrubar a categoria", () => {
  const component = readFileSync(resolve(process.cwd(), "src/components/tournaments/category-registration-panel.tsx"), "utf8");
  const form = readFileSync(resolve(process.cwd(), "src/components/tournaments/category-pair-form.tsx"), "utf8");

  assert.match(component, /CategoryPairForm/);
  assert.match(form, /<SafeActionForm action=\{addManualPairAction\} (?:className="grid-form category-pair-form"|className=\{(?:cx\()?viewStyles\.grid_form_category_pair_form(?:\))?\})/);
  assert.doesNotMatch(component, /<form action=\{addManualPairAction\} (?:className="grid-form"|className=\{(?:cx\()?viewStyles\.grid_form(?:\))?\})/);
});

test("inserção manual de dupla permite localizar atletas digitando o nome", () => {
  const component = readFileSync(resolve(process.cwd(), "src/components/tournaments/category-pair-form.tsx"), "utf8");

  assert.match(component, /Pesquisar atleta/);
  assert.match(component, /category-athlete-search-input/);
  assert.match(component, /normaliz/);
});
