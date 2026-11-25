import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import sharp from "sharp";

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

test("browser favicons have transparent corners and visible artwork at every size", async () => {
  const ico = readFileSync("public/favicon.ico");
  const images = [readFileSync("public/brand/vx4-favicon.png")];
  for (let index = 0; index < ico.readUInt16LE(4); index++) {
    const entry = 6 + index * 16;
    const length = ico.readUInt32LE(entry + 8), offset = ico.readUInt32LE(entry + 12);
    images.push(ico.subarray(offset, offset + length));
  }
  for (const image of images) {
    const { data, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (const pixel of [0, info.width - 1, (info.height - 1) * info.width, info.width * info.height - 1]) {
      assert.equal(data[pixel * 4 + 3], 0);
    }
    assert.ok(data.some((value: number, index: number) => index % 4 === 3 && value > 200));
  }
});

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

test("VX4 exports are scalable vectors and transparent/opaque backgrounds stay intentional", async () => {
  for (const name of ["vx4-logo.svg", "vx4-logo-light.svg", "vx4-logo-white.svg", "vx4-logo-black.svg"]) {
    const svg = readFileSync(`public/brand/${name}`, "utf8");
    assert.match(svg, /viewBox=/);
    assert.doesNotMatch(svg, /<image\b|<script\b|https?:\/\/(?!www\.w3\.org)/);
  }
  for (const [name, alpha] of [["transparent", 0], ["white", 255], ["black", 255]] as const) {
    const { data, info } = await sharp(`public/brand/vx4-logo-${name}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 3600);
    assert.equal(data[3], alpha);
    if (name === "white") assert.deepEqual([...data.subarray(0, 3)], [255, 255, 255]);
    if (name === "black") assert.deepEqual([...data.subarray(0, 3)], [0, 0, 0]);
  }
  for (const [name, size] of [["vx4-app-192", 192], ["vx4-app-512", 512], ["vx4-app", 1024], ["vx4-instagram", 1080]] as const) {
    const metadata = await sharp(`public/brand/${name}.png`).metadata();
    assert.equal(metadata.width, size); assert.equal(metadata.height, size);
  }
});
