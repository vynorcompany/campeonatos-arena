import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { toPersistentArenaLogo, toPersistentPlayerPhoto, savePublicImageUpload, saveOptimizedPortalEventImageUpload } from "../src/lib/uploads";

test("all image entry points reject disguised executable content before storage", async () => {
  for (const file of [
    new File(["<html><script>alert(1)</script></html>"], "photo.jpg", { type: "image/jpeg" }),
    new File(["<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"], "photo.png", { type: "image/png" }),
    new File([new Uint8Array([137, 80, 78, 71])], "broken.png", { type: "image/png" }),
  ]) {
    await assert.rejects(toPersistentArenaLogo(file), /imagem|Imagem/);
    await assert.rejects(toPersistentPlayerPhoto(file), /imagem|Imagem/);
    await assert.rejects(savePublicImageUpload(file, "test", "image", "arena"), /imagem|Imagem/);
    await assert.rejects(saveOptimizedPortalEventImageUpload(file, "arena"), /imagem|Imagem/);
  }
});

test("actual raster format must match the advertised type and SVG is rejected", async () => {
  const png = await sharp({ create: { width: 4, height: 4, channels: 4, background: "transparent" } }).png().toBuffer();
  await assert.rejects(toPersistentPlayerPhoto(new File([new Uint8Array(png)], "fake.jpg", { type: "image/jpeg" })), /imagem/i);
  await assert.rejects(toPersistentArenaLogo(new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" })), /JPG, PNG ou WEBP/);
});

test("persisted photos are decoded, resized and stripped of metadata and appended payloads", async () => {
  const jpeg = await sharp({ create: { width: 1600, height: 800, channels: 3, background: "green" } })
    .withExif({ IFD0: { Artist: "private-person" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "40/1 30/1 0/1" } }).jpeg().toBuffer();
  const payload = Buffer.concat([jpeg, Buffer.from("<script>private-payload</script>")]);
  const result = await toPersistentPlayerPhoto(new File([new Uint8Array(payload)], "photo.jpg", { type: "image/jpeg" }));
  assert.match(result!, /^data:image\/png;base64,/);
  const content = Buffer.from(result!.split(",")[1], "base64");
  const metadata = await sharp(content).metadata();
  assert.equal(metadata.width, 1024);
  assert.equal(metadata.height, 512);
  assert.equal(metadata.exif, undefined);
  assert.equal(content.includes(Buffer.from("private-payload")), false);
  assert.equal(content.includes(Buffer.from("private-person")), false);
});

test("oversized decoded dimensions are rejected even when the source file is small", async () => {
  const png = await sharp({ create: { width: 5000, height: 5000, channels: 3, background: "white" } }).png().toBuffer();
  assert.ok(png.length < 500 * 1024);
  await assert.rejects(toPersistentArenaLogo(new File([new Uint8Array(png)], "large.png", { type: "image/png" })), /24 megapixels/);
});
