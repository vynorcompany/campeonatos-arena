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
  assert.equal(ico.readUInt16LE(4), 1);
  assert.equal(ico[6], 64);
  assert.equal(ico[7], 64);
  assert.equal(ico.readUInt32LE(18), 22);
  assert.deepEqual(ico.subarray(22, 30), pngSignature);
  assert.equal(ico.readUInt32LE(14), ico.length - 22);
});
