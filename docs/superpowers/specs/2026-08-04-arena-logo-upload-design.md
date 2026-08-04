# Arena Logo Upload Design

## Goal

Replace the Arena logo with the user-provided transparent PNG so public standings and other Arena surfaces stop using the previous black-background image.

## Design

- Use the existing Arena profile logo upload flow, which persists the resulting URL in `Arena.logoUrl`.
- Upload the supplied `LOGO BRANCA - SEM FUNDO.png` file.
- Do not alter layout, CSS, or image processing. The public standings header already renders `Arena.logoUrl` without a CSS background.
- The replacement applies consistently wherever `Arena.logoUrl` is shown, including the public standings page and TV views.

## Verification

- Confirm the Arena profile accepts the PNG upload.
- Confirm the public standings header receives the updated logo URL.
