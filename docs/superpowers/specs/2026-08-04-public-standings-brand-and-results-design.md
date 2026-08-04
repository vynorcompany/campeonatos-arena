# Public Standings Brand and Results Design

## Goal

Improve the public standings page by giving the white Arena logo a blue branded header and showing results for completed games.

## Header

- Replace the current transparent public-page header treatment with the approved Option 1: a full-width blue gradient brand band.
- Place the white Arena logo above the title inside the band.
- Render `Arena Padel — Classificação e Rankings` and a concise supporting line in white with sufficient contrast.
- Keep the public navigation and filters below the band on the light page background.

## Finished Games

- Show completed games with a visible `Finalizado` status and a centered final score between the two teams.
- For League categories, show a compact set breakdown beneath the final score when set data is available, ordered as game 1, game 2, game 3.
- For knockout categories, show the final score; show sets only if the match has stored set values.
- Scheduled and in-progress games retain their existing presentation and do not expose a final result.

## Data and Error Handling

- Extend the public standings query only with the finished-match score fields required by the view.
- Do not expose unpublished categories or private match data.
- When a finished match has no usable score, retain the `Finalizado` status without a misleading synthetic score.

## Verification

- Add source/data contract coverage for completed match score exposure.
- Verify Ranking and Games public tabs continue to render.
- Verify responsive behavior and production build.
