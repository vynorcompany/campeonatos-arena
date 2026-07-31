import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createTournamentSchema } from "../src/lib/validators/tournament";
import {
  canAddCategoryPair,
  canGenerateCategoryDraw,
} from "../src/lib/tournament-category/draw";
import { matchesCategoryEligibility } from "../src/lib/tournament-category/eligibility";

const workspaceRoot = process.cwd();

test("tournament navigation does not expose the legacy players route", async () => {
  const source = await readFile(
    path.join(workspaceRoot, "src", "components", "layout", "nav-links.tsx"),
    "utf8",
  );

  assert.doesNotMatch(source, /href:\s*"\/jogadores"/);
});

test("category configuration lists every supported competition format", async () => {
  const source = await readFile(
    path.join(
      workspaceRoot,
      "src",
      "components",
      "tournaments",
      "category-competition-form.tsx",
    ),
    "utf8",
  );

  const formats = [
    ["LEAGUE", "Liga"],
    ["THREE_GROUPS", "3 grupos"],
    ["FOUR_GROUPS", "4 grupos"],
    ["SIMPLE", "Simples (grupos de 3 e 4)"],
  ] as const;

  for (const [value, label] of formats) {
    assert.match(source, new RegExp(`value="${value}"`));
    assert.ok(source.includes(label), `missing format label: ${label}`);
  }
});

test("category workspaces expose the approved operational tabs", async () => {
  const source = await readFile(
    path.join(
      workspaceRoot,
      "src",
      "components",
      "tournaments",
      "tournament-tabs.tsx",
    ),
    "utf8",
  );

  for (const label of [
    "Visão geral",
    "Inscrições",
    "Grupos",
    "Jogos",
    "Resultados",
  ]) {
    assert.ok(source.includes(label), `missing category tab: ${label}`);
  }

  assert.doesNotMatch(source, /Participantes|Configurações/);
});

test("focused panels submit through the category lifecycle server actions", async () => {
  const [registrationPanel, drawPanel, resultsPanel] = await Promise.all([
    readFile(
      path.join(
        workspaceRoot,
        "src",
        "components",
        "tournaments",
        "category-registration-panel.tsx",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        workspaceRoot,
        "src",
        "components",
        "tournaments",
        "category-draw-panel.tsx",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        workspaceRoot,
        "src",
        "components",
        "tournaments",
        "category-results-panel.tsx",
      ),
      "utf8",
    ),
  ]);

  assert.match(registrationPanel, /addManualPairAction/);
  assert.match(drawPanel, /generateCategoryDrawAction/);
  assert.match(drawPanel, /moveCategoryPairAction/);
  assert.match(drawPanel, /publishCategoryDrawAction/);
  assert.match(resultsPanel, /recordCategoryMatchResultAction/);
  assert.match(resultsPanel, /finishCategoryCompetitionAction/);
});

test("event form contains metadata and no category preset editor", async () => {
  const source = await readFile(
    path.join(
      workspaceRoot,
      "src",
      "components",
      "forms",
      "tournament-form.tsx",
    ),
    "utf8",
  );

  assert.match(source, /name="name"/);
  assert.match(source, /name="description"/);
  assert.match(source, /name="publicSlug"/);
  assert.doesNotMatch(source, /TOURNAMENT_CATEGORY_PRESETS|Categorias em ordem/);
});

test("an event can be created before any category is configured", () => {
  const parsed = createTournamentSchema.safeParse({
    creationMode: "MANUAL",
    name: "Evento de agosto",
    description: "",
    publicSlug: "evento-de-agosto",
    registrationPhase: "EDITING",
    groupCount: 4,
    pairsPerGroup: 3,
    priceFirstCents: 0,
    priceSecondCents: 0,
    priceThirdCents: 0,
    blockCategoryGap: false,
    maxCategoryGap: 1,
    categoryList: "",
    rankingId: "",
  });

  assert.equal(parsed.success, true);
});

test("category selectors share the normalized eligibility rule", () => {
  assert.equal(
    matchesCategoryEligibility(
      { className: " 5ª ", gender: "Masculino" },
      { className: "5ª", gender: "MASCULINO" },
    ),
    true,
  );
});

test("category selectors keep legacy athletes without profile classification available", () => {
  assert.equal(
    matchesCategoryEligibility(
      { className: "5Âª", gender: "FEMININO" },
      { className: "", gender: "" },
    ),
    true,
  );
});

test("category configuration uses standard class and binary gender selectors", async () => {
  const source = await readFile(
    path.join(
      workspaceRoot,
      "src",
      "components",
      "tournaments",
      "category-competition-form.tsx",
    ),
    "utf8",
  );

  assert.match(source, /CATEGORY_CLASS_OPTIONS/);
  assert.match(source, /<select[^>]*name="class"/);
  assert.doesNotMatch(source, /<input[^>]*name="class"/);
  assert.match(source, /CATEGORY_GENDER_OPTIONS/);
  assert.doesNotMatch(source, /value="MISTO"/);
});

test("manual registration guides the arena to manage athletes when eligibility is insufficient", async () => {
  const source = await readFile(
    path.join(
      workspaceRoot,
      "src",
      "components",
      "tournaments",
      "category-registration-panel.tsx",
    ),
    "utf8",
  );

  assert.match(source, /availableAthletes\.length < 2/);
  assert.match(source, /href="\/players"/);
  assert.match(source, /atletas ativos/i);
  assert.match(source, /athlete\.active\s*&&/);
});

test("draw availability follows the shared format rule", () => {
  assert.equal(canGenerateCategoryDraw("LEAGUE", 1), true);
  assert.equal(canGenerateCategoryDraw("THREE_GROUPS", 7), false);
  assert.equal(canGenerateCategoryDraw("THREE_GROUPS", 8), true);
  assert.equal(canGenerateCategoryDraw("SIMPLE", 17), false);
});

test("Simple stops accepting pairs at its supported draw capacity", async () => {
  assert.equal(canAddCategoryPair("SIMPLE", 15), true);
  assert.equal(canAddCategoryPair("SIMPLE", 16), false);
  assert.equal(canAddCategoryPair("LEAGUE", 40), true);

  const serviceSource = await readFile(
    path.join(
      workspaceRoot,
      "src",
      "lib",
      "services",
      "category-competition.ts",
    ),
    "utf8",
  );
  assert.match(serviceSource, /canAddCategoryPair\(/);
});

test("category saves preserve each existing group structure", async () => {
  const source = await readFile(
    path.join(
      workspaceRoot,
      "src",
      "components",
      "forms",
      "tournament-category-manager-form.tsx",
    ),
    "utf8",
  );

  assert.match(source, /groupCount:\s*category\.groupCount/);
  assert.match(source, /pairsPerGroup:\s*category\.pairsPerGroup/);
});
