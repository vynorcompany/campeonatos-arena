# Court Weekly Rules and Compact Agenda Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure recurring price and availability periods per court, then display them in a dense daily agenda.

**Architecture:** A `CourtWeeklyRule` persists weekday periods in minutes and cents. A pure helper detects interval conflicts; guarded actions write the rules. The configuration page owns rules, and the agenda reads them to mark each slot as available, unavailable, or occupied.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma/PostgreSQL, Zod, Node test runner, global CSS.

## Global Constraints

- Rules are manual and recur per court from Sunday through Saturday.
- A rule stores weekday, start minute, end minute, price in cents and availability.
- Same-court/same-weekday rules cannot overlap; adjacent rules are valid.
- Do not implement date exceptions, cell booking, payments, rate splitting or inline editing.
- Continue using the existing `calendar` read/edit permissions.

---

### Task 1: Persist and validate weekly court rules

**Files:**
- Create: `src/lib/scheduling/weekly-rule.ts`
- Create: `prisma/migrations/20260814160000_add_court_weekly_rules/migration.sql`
- Modify: `prisma/schema.prisma`
- Test: `tests/weekly-court-rule.test.ts`
- Test: `tests/court-weekly-rule-schema.test.ts`

**Interfaces:** Produces `weeklyRangesOverlap(firstStartMinute: number, firstEndMinute: number, secondStartMinute: number, secondEndMinute: number): boolean` and `CourtWeeklyRule`.

- [ ] **Step 1: Write the failing domain test**

```ts
test("weekly periods overlap only when minute ranges intersect", () => {
  assert.equal(weeklyRangesOverlap(420, 660, 600, 720), true);
  assert.equal(weeklyRangesOverlap(420, 660, 660, 720), false);
});
```

- [ ] **Step 2: Verify the red state**

Run: `npm test -- tests/weekly-court-rule.test.ts`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement the minimal model and helper**

```ts
export function weeklyRangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}
```

Add `weeklyRules CourtWeeklyRule[]` to `Court`. `CourtWeeklyRule` has `weekday Int`, `startsAtMinute Int`, `endsAtMinute Int`, `priceCents Int @default(0)`, `available Boolean @default(true)`, `courtId String`, its court relation, and `@@index([courtId, weekday])`. Migration creates the table with a cascading `courtId` foreign key.

- [ ] **Step 4: Verify green state**

Run: `npm test -- tests/weekly-court-rule.test.ts tests/court-weekly-rule-schema.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add prisma src/lib/scheduling/weekly-rule.ts tests/weekly-court-rule.test.ts tests/court-weekly-rule-schema.test.ts; git commit -m "feat: persist weekly court rules"`

### Task 2: Add guarded weekly-rule actions

**Files:**
- Modify: `src/lib/actions/calendar.ts`
- Test: `tests/court-weekly-rule-actions.test.ts`

**Interfaces:** Consumes `weeklyRangesOverlap`; produces `createCourtWeeklyRuleAction(formData: FormData)` and `deleteCourtWeeklyRuleAction(formData: FormData)`.

- [ ] **Step 1: Write the failing action test**

```ts
assert.match(actions, /export async function createCourtWeeklyRuleAction/);
assert.match(actions, /weeklyRangesOverlap/);
assert.match(actions, /export async function deleteCourtWeeklyRuleAction/);
```

- [ ] **Step 2: Verify the red state**

Run: `npm test -- tests/court-weekly-rule-actions.test.ts`

Expected: FAIL because no weekly-rule actions exist.

- [ ] **Step 3: Implement the actions**

Parse `courtId`, weekday 0–6, `startTime`, `endTime`, Brazilian money input, and availability. Convert times to minutes and money to cents. Use `requireModuleEdit("calendar")`; fetch the court by `id` and `arenaId`; reject equal/inverted times and any same-weekday range matching `weeklyRangesOverlap`; create the rule. Delete with arena-scoped `deleteMany`. Revalidate `/agenda` and `/agenda/configuracao`.

- [ ] **Step 4: Verify green state**

Run: `npm test -- tests/court-weekly-rule-actions.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/lib/actions/calendar.ts tests/court-weekly-rule-actions.test.ts; git commit -m "feat: manage weekly court rules"`

### Task 3: Configure weekly periods for the selected court

**Files:**
- Modify: `src/app/(app)/agenda/configuracao/page.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/court-weekly-rule-configuration-ui.test.ts`

**Interfaces:** Consumes Task 2 actions. Reads `Court.weeklyRules` ordered by weekday then start minute.

- [ ] **Step 1: Write the failing UI test**

```ts
assert.match(page, /Quadra selecionada/);
assert.match(page, /Dia da semana/);
assert.match(page, /Valor do horário/);
assert.match(page, /createCourtWeeklyRuleAction/);
assert.match(page, /deleteCourtWeeklyRuleAction/);
```

- [ ] **Step 2: Verify the red state**

Run: `npm test -- tests/court-weekly-rule-configuration-ui.test.ts`

Expected: FAIL because configuration has no weekly period controls.

- [ ] **Step 3: Implement selected-court configuration**

Use `searchParams.court`, defaulting to the first active arena court. Render a compact court selector, day/start/end/value/availability form, weekday-grouped rule list, and a delete `SafeActionForm` for each rule. Preserve the existing court-registration panel.

- [ ] **Step 4: Verify green state**

Run: `npm test -- tests/court-weekly-rule-configuration-ui.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add 'src/app/(app)/agenda/configuracao/page.tsx' src/app/globals.css tests/court-weekly-rule-configuration-ui.test.ts; git commit -m "feat: configure weekly court periods"`

### Task 4: Compact the daily agenda

**Files:**
- Modify: `src/app/(app)/agenda/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/daily-court-agenda-ui.test.ts`

**Interfaces:** Consumes selected-weekday `Court.weeklyRules`; uses a local slot lookup returning price and availability.

- [ ] **Step 1: Write the failing UI test**

```ts
assert.match(page, /agenda-date-strip/);
assert.match(page, /priceCents/);
assert.match(page, /Indisponível/);
assert.doesNotMatch(page, /<header className="page-header agenda-header">/);
```

- [ ] **Step 2: Verify the red state**

Run: `npm test -- tests/daily-court-agenda-ui.test.ts`

Expected: FAIL because the current agenda has an oversized header and no weekly pricing.

- [ ] **Step 3: Implement compact grid behavior**

Replace the header/current controls with `agenda-date-strip`, showing nearby days and a selected-day state. Fetch rules with every active court. For each slot, render formatted BRL price when an available rule includes it; render muted `Indisponível` when no available rule applies; preserve occurrence cells as stronger spanning blocks.

- [ ] **Step 4: Verify green state**

Run: `npm test -- tests/daily-court-agenda-ui.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add 'src/app/(app)/agenda/page.tsx' src/app/globals.css tests/daily-court-agenda-ui.test.ts; git commit -m "feat: compact the daily court agenda"`

### Task 5: Verify and publish

- [ ] **Step 1: Validate Prisma**

Run: `$env:DATABASE_URL='postgresql://placeholder:placeholder@localhost:5432/placeholder'; $env:DIRECT_URL='postgresql://placeholder:placeholder@localhost:5432/placeholder'; npx prisma generate; npx prisma validate`

Expected: generated client and valid schema.

- [ ] **Step 2: Run full checks**

Run: `npm test; npm run typecheck; git diff --check`

Expected: all tests pass, TypeScript exits 0, and no whitespace errors.

- [ ] **Step 3: Publish main**

Run: `git push origin main`

Expected: `origin/main` accepts the commit and Railway starts a deployment.

## Self-review

- Tasks 1–2 cover persistence, validation, ownership and server actions.
- Task 3 covers manual per-court weekly configuration.
- Task 4 covers the compact daily grid, price and unavailable slots.
- Date exceptions, booking creation, payments, splitting and inline editing are excluded consistently.
