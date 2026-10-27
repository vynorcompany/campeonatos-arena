import assert from "node:assert/strict";
import test from "node:test";
import { statSync } from "node:fs";
import sharp from "sharp";

for (const source of ["public/portal-padel-hero.png", "public/images/portal-finance-padel.png"]) {
  test(`lossless background reduces transfer bytes and preserves every pixel: ${source}`, async () => {
    const optimized = source.replace(/\.png$/, ".webp");
    assert.ok(statSync(optimized).size < statSync(source).size * 0.8);
    const original = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const converted = await sharp(optimized).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(converted.info.width, original.info.width);
    assert.equal(converted.info.height, original.info.height);
    assert.ok(converted.data.equals(original.data));
  });
}
