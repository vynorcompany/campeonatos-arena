# Court Booking Modal Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the booking editor larger and give operators fast four-player and equal-split charging controls.

**Architecture:** The client editor keeps four draft rows separate from persisted participants. A total court amount is local UI state used only to fill selected player values. The existing server action continues to receive only selected players and their individual amounts.

**Tech Stack:** Next.js 14, React, TypeScript, CSS and Node tests.

## Global Constraints

- Four athlete rows appear by default; empty rows are never persisted.
- Equal split assigns the cent remainder to the final selected athlete.
- Payment behavior remains unchanged: a value with payment method is paid; a value without method is pending.

---

### Task 1: Cover modal charging controls

**Files:**
- Modify: `tests/agenda-booking-editor-ui.test.ts`

- [ ] Add assertions for `Valor da quadra`, `Dividir igualmente`, four initial rows and the interval wording `às`.
- [ ] Run `npm test -- tests/agenda-booking-editor-ui.test.ts` and observe the expected failure because the controls do not exist.

### Task 2: Extend the booking editor state

**Files:**
- Modify: `src/components/agenda-slot-dialog.tsx`

- [ ] Initialize four participant draft rows, using an empty `playerId` for unused positions.
- [ ] Filter empty rows when serializing participants for `saveCourtBookingAction`.
- [ ] Add editable court total state, equal-split calculation and display the computed end time with `HH:MM às HH:MM`.
- [ ] Run `npm test -- tests/agenda-booking-editor-ui.test.ts` and `npx tsc --noEmit`; expect both to pass.

### Task 3: Expand the modal layout

**Files:**
- Modify: `src/app/globals.css`

- [ ] Increase modal maximum width to 1,100px and adjust the form grid so charge controls and athlete rows use the wider canvas.
- [ ] Run the targeted UI test and typecheck again.

### Task 4: Verify and publish

- [ ] Run the three agenda tests and `npx tsc --noEmit`.
- [ ] Build using placeholder `DATABASE_URL` and `DIRECT_URL`.
- [ ] Run `git diff --check`, commit and push `main`.
