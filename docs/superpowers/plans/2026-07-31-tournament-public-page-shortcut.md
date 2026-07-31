# Atalho da Página Pública do Torneio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tournament-header shortcut that opens the arena's public ranking and games page.

**Architecture:** Include the arena slug in the existing tournament query and render one Next.js `Link` in the header. No new route, API, or data model is needed.

**Tech Stack:** Next.js App Router, TypeScript, Node test runner with `tsx`.

## Global Constraints

- The public destination is `/classificacao/{arenaSlug}`.
- The shortcut opens in a new browser tab.
- Existing public visibility rules remain unchanged.

---

### Task 1: Tournament public-page shortcut

**Files:**
- Modify: `src/app/(app)/torneios/[tournamentId]/page.tsx`
- Modify: `tests/tournament-category-ui.test.ts`

**Interfaces:**
- Consumes: `Tournament.arena.slug` through Prisma's relation include.
- Produces: header link to `/classificacao/${tournament.arena.slug}`.

- [ ] Write a failing source-contract test that asserts the arena slug include, public route, and `target="_blank"`.
- [ ] Run `npx tsx --test tests/tournament-category-ui.test.ts` and confirm failure.
- [ ] Add the arena include and minimal header link.
- [ ] Re-run the test and confirm zero failures.
- [ ] Commit the implementation and test.
