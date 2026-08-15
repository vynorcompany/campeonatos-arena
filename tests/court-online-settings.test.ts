import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("courts persist visual order, color and online reservation combinations", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/agenda/configuracao/page.tsx"), "utf8");
  const agenda = readFileSync(resolve(process.cwd(), "src/app/(app)/agenda/page.tsx"), "utf8");

  assert.match(schema, /model Court \{[\s\S]*displayOrder\s+Int/);
  assert.match(schema, /model Court \{[\s\S]*color\s+String/);
  assert.match(schema, /model Court \{[\s\S]*onlineSlotMinutes\s+Int/);
  assert.match(schema, /model Court \{[\s\S]*onlineDurationMinutes\s+Int\[\]/);
  assert.match(actions, /export async function updateCourtSettingsAction/);
  assert.match(actions, /export async function moveCourtAction/);
  assert.match(actions, /export async function copyCourtConfigurationAction/);
  assert.match(page, /reserva online/i);
  assert.match(page, /Aplicar a outras quadras/);
  assert.match(agenda, /daily-court-heading/);
});

test("primary action buttons use the shared subtle rounded control style", () => {
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(styles, /\.button\s*\{[\s\S]*?border-radius:\s*var\(--radius-control\)/);
  assert.match(styles, /--radius-control:\s*8px/);
});
