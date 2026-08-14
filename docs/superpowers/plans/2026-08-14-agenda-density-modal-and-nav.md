# Agenda Density, Modal and Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the court agenda dense and interactive, compact court configuration, and retain only the approved sidebar items.

**Architecture:** A small client component receives normalized slot details from the server agenda page and controls the central dialog. The server pages continue owning Prisma reads and form actions. Navigation is reduced declaratively in the existing sidebar map.

**Tech Stack:** Next.js 14, React, TypeScript, Prisma, existing global CSS and Node tests.

## Global Constraints

- Keep seven date buttons with the viewed day fixed at the center and visibly selected.
- Open all slot states in a central dialog with background blur.
- Keep reservations read-only in this dialog iteration.
- Weekly availability stays scoped to a selected court and includes online availability.
- Sidebar only exposes Dashboard, Torneios, Tela da TV, Atletas and Configurações.

---

### Task 1: Add slot-dialog interaction

**Files:**
- Create: `src/components/agenda-slot-dialog.tsx`
- Modify: `src/app/(app)/agenda/page.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/agenda-slot-dialog-ui.test.ts`

- [ ] Write a failing source test asserting `AgendaSlotDialog`, `agenda-slot-trigger` and `agenda-slot-backdrop`.
- [ ] Run `npm test -- tests/agenda-slot-dialog-ui.test.ts` and observe failure.
- [ ] Implement a client dialog receiving `{ courtName, dateLabel, startsAt, endsAt, state, priceCents, title?, sourceType? }`; button triggers open it, Escape/backdrop/close button close it, and background uses `backdrop-filter: blur`.
- [ ] Replace static slot cells with the trigger while preserving table row spans for occurrences.
- [ ] Run the test again and commit `feat: add agenda slot dialog`.

### Task 2: Compact agenda and court selector

**Files:**
- Modify: `src/app/(app)/agenda/page.tsx`
- Modify: `src/app/(app)/agenda/configuracao/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/daily-court-agenda-ui.test.ts`

- [ ] Write failing assertions for the centered selected date class and a native `select` named `court`.
- [ ] Run `npm test -- tests/daily-court-agenda-ui.test.ts` and observe failure.
- [ ] Render the middle date with `agenda-date-item-centered`; render an explicit selector that submits `court` and preserve grouped weekly rule forms below it. Remove extra configuration header space and use compact responsive rows.
- [ ] Make the agenda shell use viewport-height-aware layout and the grid consume available vertical space.
- [ ] Run the test again and commit `feat: compact court agenda controls`.

### Task 3: Reduce sidebar navigation

**Files:**
- Modify: `src/components/layout/nav-links.tsx`
- Test: `tests/reduced-sidebar-navigation.test.ts`

- [ ] Write a failing test asserting approved visible labels and absence of Agenda, Aulas, PDV, Financeiro and Suporte as top-level links.
- [ ] Run `npm test -- tests/reduced-sidebar-navigation.test.ts` and observe failure.
- [ ] Keep Dashboard; keep Torneios and Tela da TV; keep Atletas; move Agenda de quadras and Configuração into Configurações; remove all other groups from `navigationGroups` while retaining permission map entries for hidden routes.
- [ ] Run the test again and commit `feat: simplify arena sidebar`.

### Task 4: Verify and publish

- [ ] Run `npm test; npm run typecheck`.
- [ ] Run build with placeholder validation variables: `$env:DATABASE_URL='postgresql://placeholder:placeholder@localhost:5432/placeholder'; $env:DIRECT_URL='postgresql://placeholder:placeholder@localhost:5432/placeholder'; npm run build`.
- [ ] Run `git diff --check`, commit remaining work, then `git push origin main`.

## Self-review

- Task 1 covers central modal and blur.
- Task 2 covers density, centered day and explicit court selection.
- Task 3 covers exactly the requested sidebar reduction.
- Task 4 verifies test, typecheck, build and publication.
