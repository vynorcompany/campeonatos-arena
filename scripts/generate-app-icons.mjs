import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(resolve(root, "public/icon.svg"));
const apple = await sharp(source).resize(180, 180).png().toBuffer();
await writeFile(resolve(root, "public/apple-touch-icon.png"), apple);
await writeFile(resolve(root, "public/apple-touch-icon-precomposed.png"), apple);

const faviconPng = await sharp(source).resize(64, 64).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2); // ICO image type
header.writeUInt16LE(1, 4); // one image
header[6] = 64;
header[7] = 64;
header.writeUInt16LE(1, 10); // color planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(faviconPng.length, 14);
header.writeUInt32LE(header.length, 18);
await writeFile(resolve(root, "public/favicon.ico"), Buffer.concat([header, faviconPng]));
