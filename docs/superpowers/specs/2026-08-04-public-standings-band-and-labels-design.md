# Public Standings Band and Labels Design

## Goal

Align the public standings desktop brand band with the page content and remove repeated option labels.

## Brand Band

- The blue band spans the entire viewport, without the page container's white side gutters.
- Its inner lockup uses the same desktop content width and left edge as tabs, filters, and standings.
- The approved mobile layout remains unchanged.

## Option Labels

- The General Ranking option is shown only as `Ranking Geral`.
- League options show only the category/league name, without repeating the event name.
- Option ids and selection behavior remain unchanged.

## Verification

- Add source contracts for full-bleed band layout and concise option labels.
- Run public standings tests, typecheck, production build, and confirm desktop/mobile rendering.
