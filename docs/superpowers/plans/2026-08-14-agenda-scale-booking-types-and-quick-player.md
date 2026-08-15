# Agenda Scale, Booking Types and Quick Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the agenda workspace and provide configurable booking types with in-modal player search and creation.

**Architecture:** Prisma adds arena-scoped booking types and schedules retain the selected type label. The calendar action guarantees defaults and exposes a guarded quick-player action. The client dialog builds its title from the selected client and type, and opens a nested creation dialog if the search has no match.

**Tech Stack:** Next.js 14, React, TypeScript, Prisma, Zod and Node tests.

## Global Constraints

- Default types are Aula, Aula fixa, Plano, Super 12, Liga and Reserva.
- New players require name and phone, and are scoped to the authenticated arena.
- The booking title is `Nome do cliente - Tipo de reserva`.
- The agenda must use the available desktop workspace.

---

### Task 1: Persist booking types

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260814190000_add_booking_types/migration.sql`
- Test: `tests/booking-type-schema.test.ts`

- [ ] Write schema assertions for `BookingType`, `arenaId`, `name`, active status and an occurrence type field.
- [ ] Run the schema test and observe failure.
- [ ] Add `BookingType`, arena relation and `bookingTypeName` to `ScheduleOccurrence`; generate a matching migration.
- [ ] Run Prisma validation and the schema test.

### Task 2: Add guarded booking type and quick-player actions

**Files:**
- Modify: `src/lib/actions/calendar.ts`
- Test: `tests/booking-type-actions.test.ts`

- [ ] Write failing source assertions for default types, `createBookingTypeAction`, `createQuickPlayerAction`, arena scope and phone validation.
- [ ] Run the action test and observe failure.
- [ ] Implement default type retrieval, creation action, quick player creation and booking action parsing of `bookingTypeName`.
- [ ] Run the action test and TypeScript.

### Task 3: Add settings and editor controls

**Files:**
- Modify: `src/app/(app)/arena/page.tsx`
- Modify: `src/components/agenda-slot-dialog.tsx`
- Modify: `src/app/(app)/agenda/page.tsx`
- Test: `tests/agenda-booking-types-ui.test.ts`

- [ ] Write failing assertions for booking type, automatic title, player search, quick creation modal and no modality field.
- [ ] Run the UI test and observe failure.
- [ ] Render booking type creation in arena settings; pass the type list into the agenda editor; implement player search and nested form; select the saved player in the caller row.
- [ ] Run UI test and typecheck.

### Task 4: Use the available agenda workspace

**Files:**
- Modify: `src/app/globals.css`
- Test: `tests/daily-court-agenda-ui.test.ts`

- [ ] Extend the failing UI test for full-width workspace classes.
- [ ] Run it and observe failure.
- [ ] Update page/table width, padding and cell typography while retaining responsive scroll behavior.
- [ ] Run the targeted test and typecheck.

### Task 5: Verify and publish

- [ ] Run agenda and booking type tests with `npx tsc --noEmit`.
- [ ] Build with placeholder `DATABASE_URL` and `DIRECT_URL`.
- [ ] Run `git diff --check`, commit and push `main`.
