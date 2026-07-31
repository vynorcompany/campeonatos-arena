# Event List and Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace nested event cards with aligned editorial rows and remove obsolete tournament submenu items.

**Architecture:** Rework only the event list markup/CSS and navigation item array; preserve data queries, actions and permissions.

**Tech Stack:** Next.js, React, CSS, TypeScript, node:test.

## Global Constraints

- Event list: left identity, center metadata, right action.
- Sidebar Torneios exposes only Jogos and Rankings.

### Task 1: Editorial event rows and sidebar cleanup

**Files:** modify `src/app/(app)/torneios/page.tsx`, `src/components/layout/nav-links.tsx`, `src/app/globals.css`; create `tests/event-list-sidebar.test.ts`.

- [ ] Write failing tests that assert nav lacks Duplas/Grupos and event page contains event-row markup with Abrir action.
- [ ] Run focused test; expect failure.
- [ ] Render event rows with aligned identity/metadata/action columns, subdued category text and matching history rows. Remove nested SectionCard/page-header usage for each event. Remove Duplas/Grupos from tournament children, retaining Jogos/Rankings.
- [ ] Run focused/full tests, typecheck/build; commit `feat: refine event list and tournament navigation`.
