# Rankings, Public Page, Games and Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide configurable ranking models, a single public standings page, focused Games selection and editable events.

**Architecture:** Add ranking model/general flags at persistence level, then compose focused administrative and public routes from existing ranking/category services. Keep public read models separate from admin pages.

**Tech Stack:** Next.js, Prisma/PostgreSQL, Zod, React server actions, node:test.

## Global Constraints

- Ranking type (Individual/Dupla) and model (Liga/Mata-mata) are separate.
- Only one individual Ranking Geral per arena.
- Public page lists only Ranking Geral and public finished categories, with event name.
- Games is Event active → Category → score entry.

### Task 1: Ranking models, general flag and event edit

**Files:** modify `prisma/schema.prisma`, migration, ranking validators/actions/forms/pages, event form/action; create `tests/ranking-model-and-event-edit.test.ts`.

- [ ] Write failing tests for Liga rule keys `CHAMPION,RUNNER_UP,THIRD,PARTICIPATION`, Mata keys `CHAMPION,RUNNER_UP,SEMIFINAL,QUARTERFINAL,PARTICIPATION`, and one arena general flag.
- [ ] Implement `model` and `isGeneral` persistence with a partial unique index, model-aware form fields, dynamic rule inputs, and name update for existing events.
- [ ] Run tests/typecheck/migration locally; commit `feat: configure ranking models and general ranking`.

### Task 2: Category public visibility and unified external standings

**Files:** modify category schema/config/action; create public route and read service/components; create `tests/public-standings.test.ts`.

- [ ] Write failing tests proving only public+finished categories appear and labels include their event; Ranking Geral is included when configured.
- [ ] Add category `isPublic`, admin toggle, and one arena public route with selector. Render sports final placement for categories and general leaderboard for general ranking only.
- [ ] Run tests/typecheck/build; commit `feat: add unified public standings page`.

### Task 3: Focused Games selector and navigation

**Files:** modify `/jogos` route/components and sidebar; create `tests/games-selector.test.ts`.

- [ ] Write failing tests for active event and category selection, category-scoped score URL, and no cross-category data.
- [ ] Render active event selector then category selector; route score entry to dedicated category workspace games tab. Keep only Jogos/Rankings under Torneios.
- [ ] Run tests/typecheck/build; commit `feat: focus games by event and category`.
