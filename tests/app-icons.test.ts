import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

test("ícones de navegador e iOS têm formatos e dimensões válidos", () => {
  for (const name of ["apple-touch-icon.png", "apple-touch-icon-precomposed.png"]) {
    const png = readFileSync(`public/${name}`);
    assert.deepEqual(png.subarray(0, 8), pngSignature);
    assert.equal(png.readUInt32BE(16), 180);
    assert.equal(png.readUInt32BE(20), 180);
  }

  const ico = readFileSync("public/favicon.ico");
  assert.equal(ico.readUInt16LE(2), 1);
  const count = ico.readUInt16LE(4);
  assert.ok(count >= 1);
  const sizes = new Set<number>();
  for (let index = 0; index < count; index += 1) {
    const entry = 6 + index * 16;
    const width = ico[entry] || 256, height = ico[entry + 1] || 256;
    const length = ico.readUInt32LE(entry + 8), offset = ico.readUInt32LE(entry + 12);
    assert.ok(offset >= 6 + count * 16 && offset + length <= ico.length);
    const png = ico.subarray(offset, offset + length);
    assert.deepEqual(png.subarray(0, 8), pngSignature);
    assert.equal(png.readUInt32BE(16), width);
    assert.equal(png.readUInt32BE(20), height);
    sizes.add(width);
  }
  assert.ok(sizes.has(16) && sizes.has(32) && sizes.has(64));
});
