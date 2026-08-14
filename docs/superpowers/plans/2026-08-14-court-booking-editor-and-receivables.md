# Court Booking Editor and Receivables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create/edit court bookings with athletes and synchronize each athlete's charge to receivables.

**Architecture:** Prisma stores booking participants and their financial entry links. A guarded transaction creates or updates the occurrence, participants and `FinancialEntry` records. The client booking editor replaces the read-only slot dialog.

**Tech Stack:** Next.js 14, React, TypeScript, Prisma, Zod and Node tests.

## Global Constraints

- Every participant is an arena-scoped Player.
- Payment method means paid; blank method means pending receivable.
- No participant without positive value produces an entry.
- Court conflicts remain blocked.

### Task 1: Persist booking participants

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260814170000_add_schedule_participants/migration.sql`
- Test: `tests/schedule-participant-schema.test.ts`

- [ ] Write schema assertions for `ScheduleParticipant`, `playerId`, `financialEntryId` and uniqueness by occurrence/player.
- [ ] Run `npm test -- tests/schedule-participant-schema.test.ts` and observe failure.
- [ ] Add participant relations to `ScheduleOccurrence`, `Player` and `FinancialEntry`; add model fields `amountCents`, `paymentMethod`, `financialEntryId` and indexes.
- [ ] Generate/validate Prisma and run the test again.

### Task 2: Add atomic booking action

**Files:**
- Modify: `src/lib/actions/calendar.ts`
- Test: `tests/court-booking-action.test.ts`

- [ ] Write failing source assertions for `saveCourtBookingAction`, transaction, `FinancialEntry` paid/pending status and conflict helper.
- [ ] Run `npm test -- tests/court-booking-action.test.ts` and observe failure.
- [ ] Parse booking title, court, datetime, duration, modality, notes and JSON participants; verify arena ownership and court conflict; transactionally save occurrence, court relation, participant rows and entries.
- [ ] Run action test and typecheck.

### Task 3: Replace slot dialog with booking editor

**Files:**
- Modify: `src/components/agenda-slot-dialog.tsx`
- Modify: `src/app/(app)/agenda/page.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/agenda-booking-editor-ui.test.ts`

- [ ] Write failing assertions for player selection, value, payment method, duration, participant total and `saveCourtBookingAction`.
- [ ] Run `npm test -- tests/agenda-booking-editor-ui.test.ts` and observe failure.
- [ ] Supply arena players to the client editor; allow add/remove rows, calculate total and submit serialized participants; prefill existing occurrence participants and render errors/success.
- [ ] Add high-contrast selected-date CSS and run UI tests/typecheck.

### Task 4: Verify and publish

- [ ] Run `npm test; npm run typecheck`.
- [ ] Run production build with placeholder `DATABASE_URL` and `DIRECT_URL`.
- [ ] Run `git diff --check`, commit and push `main`.
