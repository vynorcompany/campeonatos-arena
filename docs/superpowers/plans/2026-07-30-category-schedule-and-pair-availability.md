# Category Schedule and Pair Availability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save manual date/time per category game and hide already paired athletes within that category.

**Architecture:** Extend the category-match service/action input and existing game form; derive available athlete options from category pair membership before rendering selectors.

**Tech Stack:** Next.js, Prisma, Zod, TypeScript, node:test.

## Global Constraints

- Date and time are manual and per game.
- Pair availability is category-local; no cross-category exclusion.
- Service keeps duplicate-pair validation.

### Task 1: Game schedule and available athlete selectors

**Files:** modify `prisma/schema.prisma`, migration, `src/lib/validators/category-competition.ts`, `src/lib/services/category-competition.ts`, `src/lib/actions/category-competition.ts`, `src/components/tournaments/category-results-panel.tsx`, `src/components/tournaments/category-registration-panel.tsx`, category route; create `tests/category-schedule-availability.test.ts`.

- [ ] Write failing tests for `scheduledDate`/`scheduledTime` validation and for a paired athlete excluded from `availableAthletes` in one category but available in another.
- [ ] Run `npx tsx --test tests/category-schedule-availability.test.ts`; expect failure.
- [ ] Add nullable date/time to `CategoryMatch`; add guarded action/service to update one match schedule; render `<input type="date">` and `<input type="time">` for every game. Derive available options by subtracting selected category pair-player IDs only. Preserve server duplicate validation.
- [ ] Generate/apply local migration; run focused/full tests, typecheck and build; commit `feat: schedule category games and filter paired athletes`.
