# Results Versus Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display sports standings in Results and ranking points only in Rankings.

**Architecture:** Reuse existing standings/placement rules in the category route and pass sports rows to the results panel; remove `totalPoints` rendering from category results.

**Tech Stack:** Next.js, TypeScript, node:test.

## Global Constraints

- Liga: position, pair, matches, wins, losses, differential; wins/head-to-head/differential order.
- Knockout: final sports placement only.
- No ranking points in Results; ranking UI after finish only.

### Task 1: Render sports standings

**Files:** modify category route and `src/components/tournaments/category-results-panel.tsx`; create `tests/results-versus-ranking.test.ts`.

- [ ] Write failing tests asserting Liga headers Jogos/Vitórias/Derrotas/Saldo and no `totalPoints`/`pts` in results component.
- [ ] Run focused test; expect failure.
- [ ] Derive standings from completed matches in the selected category route, pass rows to Results, render Liga table and knockout final placement without ranking points. Keep ranking application unchanged and visible only on Rankings pages after finish.
- [ ] Run focused/full tests, typecheck and build; commit `fix: show sports standings in category results`.
