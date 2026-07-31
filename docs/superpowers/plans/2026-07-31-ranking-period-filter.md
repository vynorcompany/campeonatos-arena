# Ranking Period Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task.

**Goal:** Add compact current-month, quarter, semester, annual, custom, and cycle ranking filters while fixing configuration persistence and checkbox layout.

**Architecture:** A shared period resolver supplies normalized ranges to classification and usage. Configuration uses non-returning advisory-lock execution so PostgreSQL lock functions never reach Prisma result deserialization.

**Tech Stack:** Next.js, TypeScript, Prisma, React, Node test runner.

## Constraints

- Default period is current month; ranges are inclusive and preserve selection between tabs.
- Do not change scoring rules or public standings.

### Task 1: Ranking configuration reliability and layout

**Files:** `src/lib/actions/tournament.ts`, `src/components/forms/ranking-configuration-form.tsx`, `src/app/globals.css`, `tests/ranking-workspace.test.ts`

- [ ] Add a failing test that requires advisory locks to use `$executeRaw` and checkbox controls to share a bounded card layout with their label text.
- [ ] Run `npx tsx --test tests/ranking-workspace.test.ts` and observe failure.
- [ ] Replace advisory lock `$queryRaw` calls with `$executeRaw`; render each General option as a compact control card; add CSS grid alignment, gap, and checkbox sizing.
- [ ] Re-run the focused test and `npm run typecheck`.
- [ ] Commit `fix: stabilize ranking configuration controls`.

### Task 2: Period presets, custom ranges, and cycles

**Files:** `src/lib/services/ranking.ts`, `src/app/(app)/torneios/rankings/[rankingId]/page.tsx`, `src/components/tournaments/ranking-workspace-tabs.tsx`, `tests/ranking-workspace.test.ts`

- [ ] Add failing tests for month, quarter, semester, year, custom, and cycle range normalization and tab-link preservation.
- [ ] Run the focused test and observe failure.
- [ ] Add a compact period bar, custom date inputs, cycle selector/creation controls, normalized query values, and reuse the resolved range in Classification and Usage.
- [ ] Run focused tests, full suite, typecheck, and build with local environment.
- [ ] Commit `feat: add flexible ranking period filters`.
