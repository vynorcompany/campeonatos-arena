# Filtro de Status dos Jogos da Categoria Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filter the category game list by a single selected operational status.

**Architecture:** The route validates `searchParams.status`, passes it to the existing results panel, and the panel filters its copied match list before applying the existing sort criterion.

**Tech Stack:** Next.js App Router, TypeScript, Node test runner with `tsx`.

## Global Constraints

- Status choices are ALL, SCHEDULED, LIVE, and FINISHED.
- The selected sort remains in the URL.
- The filter does not mutate competition data.

---

### Task 1: Category game status filter

**Files:**
- Modify: `src/app/(app)/torneios/[tournamentId]/categorias/[categoryId]/page.tsx`
- Modify: `src/components/tournaments/category-results-panel.tsx`
- Modify: `tests/tournament-category-ui.test.ts`

**Interfaces:**
- Consumes: `searchParams.status`.
- Produces: a `statusFilter` panel prop and filtered rendered matches.

- [ ] Write and run a failing source-contract test.
- [ ] Validate the query parameter and render the status selector.
- [ ] Filter matches before calling the existing ordering helper.
- [ ] Run the complete test suite and production build.
- [ ] Commit and push to `main`.
