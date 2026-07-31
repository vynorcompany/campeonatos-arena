# Ranking Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform rankings into a compact index with creation and tabbed workspaces, while making name updates reliable.

**Architecture:** Retain existing Prisma services and split the current all-in-one page into index, create, and detail routes. Configuration and points use separate actions/forms so a name edit never requires unrelated score inputs.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, Zod, Node test runner.

## Global Constraints

- Preserve the current Ranking Geral and feed-to-Geral rules.
- Preserve Liga and Mata-mata point models.
- Do not change the public standings page.
- Reproduce the name-update failure through a test before its production-code fix.

---

### Task 1: Isolate configuration updates and surface errors

**Files:**
- Modify: `src/lib/actions/tournament.ts`
- Modify: `src/lib/validators/ranking.ts`
- Test: `tests/ranking-model-and-event-edit.test.ts`

**Interfaces:**
- Produces `updateRankingConfigurationAction(formData)` and `updateRankingConfigurationSchema`.

- [ ] **Step 1: Add failing tests**

```ts
test("ranking configuration accepts a name-only update", () => {
  const parsed = updateRankingConfigurationSchema.safeParse({
    rankingId: "ranking-1", name: "Liga Masculina 2026", description: "",
    type: "PAIR", model: "LEAGUE", isGeneral: false, feedsGeneralRanking: false,
  });
  assert.equal(parsed.success, true);
});

test("ranking configuration maps duplicate names to readable text", () => {
  assert.match(getRankingUpdateError({ code: "P2002" }), /nome/i);
});
```

- [ ] **Step 2: Verify RED**

Run `npx tsx --test tests/ranking-model-and-event-edit.test.ts`; expect failure because the new schema/error mapper do not exist.

- [ ] **Step 3: Implement minimal configuration update**

Create a schema with only `rankingId`, `name`, `description`, `type`, `model`, `isGeneral`, and `feedsGeneralRanking`. Reuse the existing ownership, compatibility, serializable transaction, and general-ranking guards. Map Prisma `P2002` to `Já existe um ranking com este nome na arena.` and preserve other messages.

- [ ] **Step 4: Verify GREEN and commit**

Run `npx tsx --test tests/ranking-model-and-event-edit.test.ts`; expect pass.

```bash
git add src/lib/actions/tournament.ts src/lib/validators/ranking.ts tests/ranking-model-and-event-edit.test.ts
git commit -m "fix: make ranking configuration updates explicit"
```

### Task 2: Create the clean index and dedicated creation route

**Files:**
- Modify: `src/app/(app)/torneios/rankings/page.tsx`
- Create: `src/app/(app)/torneios/rankings/novo/page.tsx`
- Create: `src/components/tournaments/ranking-list.tsx`
- Create: `src/components/forms/ranking-create-form.tsx`
- Test: `tests/ranking-workspace.test.ts`

**Interfaces:**
- Produces an index with `Abrir` links and a create route that redirects to `/torneios/rankings/[rankingId]`.

- [ ] **Step 1: Add failing tests**

```ts
test("ranking index renders summary rows and an open action", () => {
  const source = readFileSync("src/components/tournaments/ranking-list.tsx", "utf8");
  assert.match(source, /Abrir/);
  assert.doesNotMatch(source, /Salvar ranking/);
});

test("new ranking has a dedicated route", () => {
  assert.ok(existsSync("src/app/(app)/torneios/rankings/novo/page.tsx"));
});
```

- [ ] **Step 2: Verify RED**

Run `npx tsx --test tests/ranking-workspace.test.ts`; expect failure because the route/components do not exist.

- [ ] **Step 3: Implement the index and creation flow**

List only name, type, model, Geral/feed indication, usage count, and `Abrir`. Add `Novo ranking` to the header. Create form has name, description, type, and model only; redirect after create.

- [ ] **Step 4: Verify GREEN and commit**

Run `npx tsx --test tests/ranking-workspace.test.ts`; expect pass.

```bash
git add src/app/(app)/torneios/rankings/page.tsx src/app/(app)/torneios/rankings/novo/page.tsx src/components/tournaments/ranking-list.tsx src/components/forms/ranking-create-form.tsx tests/ranking-workspace.test.ts
git commit -m "feat: add ranking index and creation route"
```

### Task 3: Build the tabbed ranking workspace

**Files:**
- Modify: `src/app/(app)/torneios/rankings/[rankingId]/page.tsx`
- Create: `src/components/tournaments/ranking-workspace-tabs.tsx`
- Create: `src/components/forms/ranking-configuration-form.tsx`
- Create: `src/components/forms/ranking-points-form.tsx`
- Test: `tests/ranking-workspace.test.ts`

**Interfaces:**
- Produces `?tab=configuracao|pontuacao|classificacao|uso` and default configuration tab.

- [ ] **Step 1: Add failing tests**

```ts
test("ranking workspace exposes four operational tabs", () => {
  const source = readFileSync("src/components/tournaments/ranking-workspace-tabs.tsx", "utf8");
  for (const label of ["Configuração", "Pontuação", "Classificação", "Uso"]) assert.match(source, new RegExp(label));
});

test("configuration owns the name field", () => {
  const source = readFileSync("src/components/forms/ranking-configuration-form.tsx", "utf8");
  assert.match(source, /name="name"/);
  assert.match(source, /updateRankingConfigurationAction/);
});
```

- [ ] **Step 2: Verify RED**

Run `npx tsx --test tests/ranking-workspace.test.ts`; expect failure because tabs/forms do not exist.

- [ ] **Step 3: Implement the workspace**

Render compact header and tabs. Keep name/description/type/model/general switches in Configuração; model-compatible score inputs in Pontuação; leaderboard in Classificação; category/event rows in Uso. Keep deletion as confirmed secondary action in Configuração.

- [ ] **Step 4: Verify and commit**

Run `npx tsx --test tests/ranking-workspace.test.ts && npm run typecheck && npx tsx --test tests/*.test.ts`; expect all pass. Load local test environment variables and run `npm run build`; expect exit 0.

```bash
git add src/app/(app)/torneios/rankings/[rankingId]/page.tsx src/components/tournaments/ranking-workspace-tabs.tsx src/components/forms/ranking-configuration-form.tsx src/components/forms/ranking-points-form.tsx tests/ranking-workspace.test.ts
git commit -m "feat: organize ranking workspace by tabs"
```
