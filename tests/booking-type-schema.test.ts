import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("booking types are scoped to the arena and occurrences retain their selected label", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  assert.match(schema, /model BookingType/);
  assert.match(schema, /bookingTypes\s+BookingType\[\]/);
  assert.match(schema, /bookingTypeName\s+String/);
});
