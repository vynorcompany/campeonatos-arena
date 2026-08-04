# Persistent Arena Logo Design

## Problem

The Arena profile upload succeeds but stores its file under the Railway runtime `public/uploads` directory. The production Next server serves only the `public` directory copied during the build, so the stored URL returns HTTP 404 and the public classification shows a broken image.

## Approved Design

- Persist only the Arena profile logo as a PNG data URL in the existing `Arena.logoUrl` text field.
- Keep the current file type and 4 MB validation rules.
- Do not change other upload flows, which are outside this correction's scope.
- When a new Arena logo is uploaded, replace the broken `/uploads/...` value with the data URL and revalidate the existing Arena routes.

## Data Flow

`Arena profile form` → `updateArenaProfileAction` → validated file converted to a data URL → `Arena.logoUrl` → public standings `<img>`.

## Verification

- Add a focused test proving the Arena action uses a durable data URL rather than a runtime `/uploads` path.
- Upload the supplied PNG in production and confirm the public image URL is a `data:image/png;base64,...` value and visibly renders.
