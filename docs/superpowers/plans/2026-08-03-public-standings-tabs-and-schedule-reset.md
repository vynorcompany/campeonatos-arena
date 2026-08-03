# Public Standings Tabs and Schedule Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate the public page into Ranking and Jogos views with league/status filters, and let admins clear both date and time from a category match.

**Architecture:** Extend the public-standings helpers and service with filterable public game data. The public route parses tab and filter query strings; the server component renders the appropriate controls. The current schedule validator already maps two empty values to null, so the UI needs an explicit clear form.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, Zod, Node.js built-in test runner.

## Global Constraints

- Ranking geral is the first ranking option.
- Jogos filters are league plus Todos, Agendados, Em andamento, or Finalizados.
- Only publicly visible category competitions in the requested arena may be displayed.
- Clearing a schedule changes only `scheduledDate` and `scheduledTime`, both to null.
- Query-string state must remain shareable.

---

### Task 1: Build filterable public-game helpers

**Files:**
- Modify: `src/lib/public-standings.ts`
- Modify: `tests/public-game-agenda.test.ts`

**Interfaces:**
- Produces: `filterPublicGames(games, { categoryId, status })`.
- Produces: public game source/presentation types containing `categoryId` and `status`.

- [ ] **Step 1: Write the failing test**

Add scheduled, live, and finished games from two categories, then assert:

```ts
assert.deepEqual(
  filterPublicGames(games, { categoryId: "category-a", status: "LIVE" }).map(
    (game) => game.label,
  ),
  ["Em andamento"],
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/public-game-agenda.test.ts`

Expected: FAIL because `filterPublicGames` is not exported.

- [ ] **Step 3: Write minimal implementation**

Add `PublicGameStatus = "SCHEDULED" | "LIVE" | "FINISHED"` and:

```ts
export function filterPublicGames(
  games: PublicGameSource[],
  filters: { categoryId: string | null; status: PublicGameStatus | "ALL" },
) {
  return games.filter(
    (game) =>
      (!filters.categoryId || game.categoryId === filters.categoryId) &&
      (filters.status === "ALL" || game.status === filters.status),
  );
}
```

Update `buildPublicGameAgenda` to preserve status and use an `A definir` group for undated games.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/public-game-agenda.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/public-standings.ts tests/public-game-agenda.test.ts
git commit -m "feat: filter public games by league and status"
```

### Task 2: Load public games and parse public navigation

**Files:**
- Modify: `src/lib/services/public-standings.ts`
- Modify: `src/app/classificacao/[arenaSlug]/page.tsx`
- Modify: `tests/public-standings.test.ts`

**Interfaces:**
- Consumes: `filterPublicGames` from Task 1.
- Produces: `ArenaPublicStandings` fields for selected tab, selected game category, selected game status, category options, and filtered game days.

- [ ] **Step 1: Write failing contracts**

Add assertions that the route accepts `tab`, `league`, and `status`, and the service selects category id plus match scheduling, result, and manual-status data.

```ts
assert.match(route, /searchParams\?:\s*\{[^}]*tab\?: string[^}]*league\?: string[^}]*status\?: string/);
assert.match(service, /filterPublicGames\(/);
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx tsx --test tests/public-standings.test.ts`

Expected: FAIL due to missing query parsing and filter call.

- [ ] **Step 3: Implement service and route**

Normalize `tab=ranking|games`, `league` as a public category id or null, and `status=ALL|SCHEDULED|LIVE|FINISHED`. Load all public category matches for the arena. Derive status as FINISHED when a winner exists; otherwise retain LIVE manual status or use SCHEDULED. Return all public categories as game filter options.

- [ ] **Step 4: Run tests to verify pass**

Run: `npx tsx --test tests/public-standings.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/public-standings.ts src/app/classificacao/[arenaSlug]/page.tsx tests/public-standings.test.ts
git commit -m "feat: expose public rankings and game filters"
```

### Task 3: Render public Ranking and Jogos tabs

**Files:**
- Modify: `src/components/tournaments/public-standings.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/public-standings.test.ts`

**Interfaces:**
- Consumes: public page state from Task 2.
- Produces: accessible tab links and GET forms preserving active filter values.

- [ ] **Step 1: Write failing component contracts**

```ts
assert.match(component, />Ranking</);
assert.match(component, />Jogos</);
assert.match(component, /name="league"/);
assert.match(component, /option value="LIVE">Em andamento/);
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx tsx --test tests/public-standings.test.ts`

Expected: FAIL because the component has one selector and an always-visible agenda.

- [ ] **Step 3: Implement tabs and layout**

Render tab links for Ranking and Jogos. Render the current ranking selector/content only in Ranking; render league/status selectors and the filtered game agenda only in Jogos. Add a responsive tab row and filter grid, stacking controls under the mobile breakpoint.

- [ ] **Step 4: Run tests to verify pass**

Run: `npx tsx --test tests/public-standings.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/tournaments/public-standings.tsx src/app/globals.css tests/public-standings.test.ts
git commit -m "feat: add public ranking and games tabs"
```

### Task 4: Add clear-schedule control

**Files:**
- Modify: `src/components/tournaments/category-results-panel.tsx`
- Modify: `tests/category-schedule-availability.test.ts`

**Interfaces:**
- Consumes: existing `updateCategoryMatchScheduleAction`.
- Produces: a form labelled `Limpar agendamento` that submits the match id and empty schedule values.

- [ ] **Step 1: Write failing UI contract**

```ts
assert.match(resultsPanel, /label="Limpar agendamento"/);
assert.match(resultsPanel, /name="scheduledDate"\s+value=""/);
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx tsx --test tests/category-schedule-availability.test.ts`

Expected: FAIL because no reset form exists.

- [ ] **Step 3: Implement the explicit reset form**

Next to the existing schedule form, add a compact second form posting `matchId`, `scheduledDate=""`, and `scheduledTime=""` to `updateCategoryMatchScheduleAction`. Keep existing required date/time inputs unchanged.

- [ ] **Step 4: Run test to verify pass**

Run: `npx tsx --test tests/category-schedule-availability.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/tournaments/category-results-panel.tsx tests/category-schedule-availability.test.ts
git commit -m "feat: clear category match schedules"
```

### Task 5: Verify and publish

**Files:**
- Verify: `tests/public-game-agenda.test.ts`
- Verify: `tests/public-standings.test.ts`
- Verify: `tests/category-schedule-availability.test.ts`

- [ ] **Step 1: Run all targeted tests**

Run: `npx tsx --test tests/public-game-agenda.test.ts tests/public-standings.test.ts tests/category-schedule-availability.test.ts`

Expected: all tests PASS.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 3: Run production build**

Run: `node --env-file=C:\Users\jefer\campeonatos-arena\.worktrees\tournament-management-implementation\.env node_modules\next\dist\bin\next build`

Expected: build succeeds; the existing ESLint plugin duplication warning may appear.

- [ ] **Step 4: Prepare standalone output**

Run: `node scripts\prepare-standalone.mjs`

Expected: exit code 0.

- [ ] **Step 5: Push main**

```bash
git push origin main
```

