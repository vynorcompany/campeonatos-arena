# Agenda Court Workspace and Configuration Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Use the available agenda workspace and separate court selection from individual weekly-rule configuration.

**Architecture:** The daily query filters courts without weekly rules. The existing configuration route becomes a court list and a dynamic court route owns weekly-rule forms. The dialog filters player search client-side.

**Tech Stack:** Next.js, React, Prisma, TypeScript and Node tests.

### Task 1: Test and filter daily courts
- Add a failing agenda test for configured courts only.
- Query courts with weekly-rule existence and verify the test.

### Task 2: Restrict quick-player call to empty searches
- Add a failing dialog UI assertion.
- Render the create button only when a nonempty search has zero matches.

### Task 3: Split court configuration routes
- Add a dynamic `/agenda/configuracao/[courtId]` page using the existing per-court form.
- Simplify `/agenda/configuracao` to list/create courts and link to the new route.

### Task 4: Expand workspace and verify
- Update agenda layout CSS.
- Run tests, TypeScript, production build, commit and push.
