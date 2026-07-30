# Category Editorial Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mixed category panels with an editorial category list and a dedicated category workspace, while restoring manual athlete entry.

**Architecture:** Event detail renders only category rows. A category route loads one category and composes the existing operations into its own tabs. Shared category constants normalize class/gender values for the configuration form and athlete eligibility filter.

**Tech Stack:** Next.js 14, React, TypeScript, Prisma, Zod, node:test.

## Global Constraints

- Standard classes: 3ª, 4ª, 5ª, 6ª and 7ª; genders: Masculino and Feminino.
- Event list uses aligned rows, restrained borders and one action at the far right.
- Category workspace owns the five tabs and never renders neighboring categories.
- Manual entry validates active, class/gender-eligible distinct athletes and duplicate pairs.

---

### Task 1: Standardize category values and athlete selection

**Files:** modify `src/components/tournaments/category-competition-form.tsx`, `src/lib/tournament-category/eligibility.ts`, `src/components/tournaments/category-registration-panel.tsx`; create `src/lib/tournament-category/category-options.ts`; modify `tests/category-competition-actions.test.ts`.

- [ ] Write failing tests that import `CATEGORY_CLASS_OPTIONS` and assert five standard classes, and assert `matchesCategoryEligibility({ className: "5ª", gender: "MASCULINO" }, { className: "5ª", gender: "MASCULINO" })` is true.
- [ ] Run `npx tsx --test tests/category-competition-actions.test.ts`; expect missing constants or normalization failure.
- [ ] Export `CATEGORY_CLASS_OPTIONS = ["3ª", "4ª", "5ª", "6ª", "7ª"] as const` and the two gender options. Replace free class input with selects. Normalize `5a`, `5ª` and `5` to `5ª` before eligibility comparison. In the registration panel show only matching athletes and a Gestão → Atletas link when fewer than two exist.
- [ ] Run focused test and `npm run typecheck`; expect pass. Commit `fix: standardize category athlete eligibility`.

### Task 2: Build event list and dedicated category route

**Files:** modify `src/app/(app)/torneios/[tournamentId]/page.tsx`; create `src/app/(app)/torneios/[tournamentId]/categorias/[categoryId]/page.tsx`; create `src/components/tournaments/category-list.tsx`; modify `src/components/tournaments/tournament-tabs.tsx`; create `tests/category-editorial-navigation.test.ts`; modify `src/app/globals.css`.

- [ ] Write failing source contracts proving an `Entrar` category link targets `/torneios/${tournamentId}/categorias/${categoryId}`, the new page exposes all five tabs, and the event page does not render `CategoryRegistrationPanel`.
- [ ] Run `npx tsx --test tests/category-editorial-navigation.test.ts`; expect failure.
- [ ] Implement one event category list with grid columns `minmax(0,1fr) 9rem 7rem 8rem` and a right-aligned action. The category route loads arena-scoped event/category/athletes/rankings; renders compact header, back link and five tabs; mounts the existing configuration, registration, draw and results panels with only the selected category.
- [ ] Add CSS for controlled content width, 14–16px row padding, subtle dividers, stable column alignment and mobile stacking. Run focused test, full tests, `npm run typecheck` and `npm run build`; expect pass. Commit `feat: add dedicated category workspace`.
