import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

test("agenda configuration exposes court registration separately from the daily grid", () => {
  const page = read("src/app/(app)/agenda/configuracao/page.tsx");
  const actions = read("src/lib/actions/calendar.ts");

  assert.match(actions, /export async function createCourtAction/);
  assert.match(page, /Quadras cadastradas/);
  assert.match(page, /createCourtAction/);
  assert.match(page, /prisma\.court\.findMany/);
});
