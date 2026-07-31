# Ordenação de Jogos da Categoria Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow category games to be viewed by round, date, or operational status.

**Architecture:** The category route validates `searchParams.sort` and passes the chosen criterion to the server-rendered results panel. The panel renders a GET selector and derives a sorted match array before rendering existing controls.

**Tech Stack:** Next.js App Router, TypeScript, Node test runner with `tsx`.

## Global Constraints

- Sorting changes only display order.
- Status priority is SCHEDULED, LIVE, FINISHED.
- Games without a date are last in date ordering.

---

### Task 1: Category game ordering

**Files:**
- Modify: `src/app/(app)/torneios/[tournamentId]/categorias/[categoryId]/page.tsx`
- Modify: `src/components/tournaments/category-results-panel.tsx`
- Modify: `tests/tournament-category-ui.test.ts`

**Interfaces:**
- Consumes: `searchParams.sort` with `round`, `date`, or `status`.
- Produces: `sort` prop for `CategoryResultsPanel` and a sorted match display.

- [ ] Write a failing source-contract test for the sort URL parameter, selector options, and status priority.
- [ ] Run `npx tsx --test tests/tournament-category-ui.test.ts` and confirm failure.
- [ ] Validate the URL parameter, add the GET selector, and sort a copied match array before rendering.
- [ ] Re-run the targeted and full test suites plus production build.
- [ ] Commit and push the change to `main`.
