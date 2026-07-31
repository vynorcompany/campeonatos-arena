# Busca por Atleta nos Jogos da Categoria Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filter category games by a player name fragment across both pairs.

**Architecture:** The route passes a trimmed `player` query parameter to the existing results panel. The panel normalizes it and applies a name match to both pair labels before the existing status filter and sort.

**Tech Stack:** Next.js App Router, TypeScript, Node test runner with `tsx`.

## Global Constraints

- Search is case-insensitive and partial.
- Search composes with status filtering and sort order.
- No competition data is mutated.

---

### Task 1: Player name search

**Files:**
- Modify: `src/app/(app)/torneios/[tournamentId]/categorias/[categoryId]/page.tsx`
- Modify: `src/components/tournaments/category-results-panel.tsx`
- Modify: `tests/tournament-category-ui.test.ts`

**Interfaces:**
- Consumes: `searchParams.player`.
- Produces: a `playerSearch` panel prop and filtered game list.

- [ ] Write a failing test for player URL/query and pair-name search.
- [ ] Pass the normalized query into the panel and render the search field.
- [ ] Filter both pair names before sorting, then run tests and build.
- [ ] Commit and push to `main`.
