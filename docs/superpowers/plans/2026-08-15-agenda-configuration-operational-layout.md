# Agenda Configuration Operational Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present court selection and weekly-period configuration as a compact, full-width operational workspace.

**Architecture:** Keep the existing server page and actions intact. Replace its presentational card layout with a toolbar for court selection/creation and a workspace for the selected court; CSS provides the responsive layout.

**Tech Stack:** Next.js App Router, React server components, TypeScript, CSS, Node test runner.

## Global Constraints

- Do not change database schema or scheduling actions.
- Do not add top-of-page marketing or decorative headings.
- Preserve existing weekly-rule fields, conflict behavior, availability toggle and removal action.

---

### Task 1: Cover the operational layout contract

**Files:**
- Modify: `tests/daily-court-agenda-ui.test.ts`

**Interfaces:**
- Consumes: `src/app/(app)/agenda/configuracao/page.tsx`
- Produces: static assertions for the toolbar and selected-court workspace.

- [ ] **Step 1: Write the failing test**

```ts
assert.match(configurationPage, /agenda-config-toolbar/);
assert.match(configurationPage, /agenda-court-tabs/);
assert.match(configurationPage, /agenda-court-workspace/);
assert.doesNotMatch(configurationPage, /page-header agenda-header/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/daily-court-agenda-ui.test.ts`
Expected: FAIL because the page has no operational toolbar or workspace classes.

- [ ] **Step 3: Commit**

```bash
git add tests/daily-court-agenda-ui.test.ts
git commit -m "test: cover agenda configuration layout"
```

### Task 2: Rebuild the configuration page structure

**Files:**
- Modify: `src/app/(app)/agenda/configuracao/page.tsx`

**Interfaces:**
- Consumes: `createCourtAction`, `createCourtWeeklyRuleAction`, `deleteCourtWeeklyRuleAction`.
- Produces: `agenda-config-toolbar`, `agenda-court-tabs` and `agenda-court-workspace` markup.

- [ ] **Step 1: Replace the header and split-card layout**

```tsx
<section className="agenda-config-toolbar">
  <nav className="agenda-court-tabs" aria-label="Quadras cadastradas">...</nav>
  <SafeActionForm action={createCourtAction} className="agenda-create-court-inline">...</SafeActionForm>
</section>
{selectedCourt ? <section className="agenda-court-workspace">...</section> : <section className="agenda-court-empty">Selecione uma quadra para configurar seus períodos.</section>}
```

- [ ] **Step 2: Keep the rule form and weekday list within the workspace**

```tsx
<SafeActionForm action={createCourtWeeklyRuleAction} className="weekly-rule-form">...</SafeActionForm>
<div className="weekly-rule-list">{weekDays.map(...)}</div>
```

- [ ] **Step 3: Run the targeted test**

Run: `npm test -- tests/daily-court-agenda-ui.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/agenda/configuracao/page.tsx tests/daily-court-agenda-ui.test.ts
git commit -m "feat: redesign agenda configuration layout"
```

### Task 3: Style the compact full-width workspace

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: the classes produced by Task 2.
- Produces: responsive toolbar, court tabs, rule form and weekly-card grid.

- [ ] **Step 1: Add the desktop layout**

```css
.agenda-config-toolbar { display:flex; align-items:center; gap:12px; }
.agenda-court-tabs { display:flex; flex:1; overflow-x:auto; }
.agenda-court-workspace { width:100%; }
.weekly-rule-list { grid-template-columns:repeat(2, minmax(0, 1fr)); }
```

- [ ] **Step 2: Add small-screen fallbacks**

```css
@media (max-width: 760px) {
  .agenda-config-toolbar, .agenda-create-court-inline, .weekly-rule-list { grid-template-columns:1fr; }
}
```

- [ ] **Step 3: Verify the project**

Run: `npm test -- tests/daily-court-agenda-ui.test.ts; npm run typecheck; npm run build`
Expected: all commands exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "style: compact agenda configuration workspace"
```
