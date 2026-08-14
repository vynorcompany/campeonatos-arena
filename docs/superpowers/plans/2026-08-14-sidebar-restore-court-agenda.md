# Restore Court Agenda Sidebar Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore Agenda de quadras as a primary sidebar panel with Configuração da agenda beneath it.

**Architecture:** Change only `navigationGroups`; permission mapping and route behavior remain untouched.

**Tech Stack:** React, TypeScript, Node test runner.

## Global Constraints

- Keep the current reduced sidebar items.
- Do not alter routes or permissions.

### Task 1: Restore primary agenda navigation

**Files:**
- Modify: `src/components/layout/nav-links.tsx`
- Modify: `tests/reduced-sidebar-navigation.test.ts`

- [ ] Write a failing assertion that Agenda de quadras has Configuração da agenda as a child.
- [ ] Run `npm test -- tests/reduced-sidebar-navigation.test.ts` and confirm failure.
- [ ] Add Agenda de quadras as a primary item after Torneios and before Tela da TV, with its configuration child; remove those agenda children from Configurações.
- [ ] Run `npm test -- tests/reduced-sidebar-navigation.test.ts; npm run typecheck` and confirm pass.
- [ ] Commit and push `main`.
