# Category Overview Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore compact F-pattern reading in the category overview.

**Architecture:** Replace the duplicate category card and detached metrics with one overview summary component; preserve all existing actions and data.

**Tech Stack:** Next.js, React, TypeScript, CSS, node:test.

## Global Constraints

- Name/status first row; context second row; metrics and next action third row.
- No duplicate name/status card and no detached metrics.

### Task 1: Compact category overview

**Files:** modify `src/app/(app)/torneios/[tournamentId]/categorias/[categoryId]/page.tsx`, `src/components/tournaments/category-competition-form.tsx`, `src/app/globals.css`; create `tests/category-overview-hierarchy.test.ts`.

- [ ] Write a failing source test asserting the overview has one `category-overview` component, contains Duplas/Jogos/Ranking Geral, and does not render `CategoryCompetitionCard` in the workspace overview.
- [ ] Run `npx tsx --test tests/category-overview-hierarchy.test.ts`; expect failure.
- [ ] Render one compact summary with `category-overview-head`, `category-overview-context`, `category-overview-metrics`, and `category-overview-action`; move existing next action into it. Add a responsive CSS grid with status/action right aligned and mobile stacking.
- [ ] Run focused/full tests, typecheck and build; expect pass. Commit `fix: align category overview hierarchy`.
