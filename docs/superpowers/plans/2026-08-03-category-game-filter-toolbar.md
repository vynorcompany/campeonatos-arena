# Barra de Filtros dos Jogos da Categoria Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix category-game filter submission and make the controls readable and responsive.

**Architecture:** Use one GET form with unique field names and a responsive toolbar class. The existing route continues to parse scalar query values.

**Tech Stack:** Next.js, TypeScript, CSS.

## Global Constraints

- Each of `sort`, `status`, and `player` appears once in the filter form.
- `tab=games` remains hidden.
- The layout must wrap cleanly on narrow screens.

---

### Task 1: Filter toolbar

**Files:**
- Modify: `src/components/tournaments/category-results-panel.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/tournament-category-ui.test.ts`

- [ ] Add a failing source-contract test for unique field names and toolbar styling.
- [ ] Remove duplicate hidden inputs, group controls, and add responsive CSS.
- [ ] Run tests, typecheck, build, then commit and push.
