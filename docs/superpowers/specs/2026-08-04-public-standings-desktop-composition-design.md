# Public Standings Desktop Composition Design

## Goal

Correct the desktop composition of the public standings page while preserving the approved mobile layout.

## Header

- Keep the blue brand band.
- On desktop, use a centered horizontal brand lockup: the panoramic white logo at 240–280 px wide, a subtle vertical divider, and title/support copy aligned to its right.
- Do not constrain the panorama logo to a square; preserve its aspect ratio.
- At the mobile breakpoint, retain the current centered, stacked header treatment.

## Ranking Filter

- On desktop, keep the Ranking label, select control, and Consultar button in one aligned row.
- The select grows to the available space; the button keeps a stable content width.
- The filter stacks only at the existing mobile breakpoint.

## Verification

- Add a source contract for the desktop lockup class and filter layout.
- Verify public standings tests, typecheck, production build, and desktop/mobile visual behavior.
