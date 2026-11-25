import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destination = resolve(root, "public/brand");
await mkdir(destination, { recursive: true });
const source = await readFile(resolve(destination, "vx4-logo.svg"), "utf8");
// A dedicated dark wordmark maintains contrast on white surfaces.
const light = source
  .replace(/#fff\b/g, "#243e5c")
  .replace(/#fafbfe/g, "#223b58").replace(/#e2e6ee/g, "#132b45")
  .replace(/#f9fbff/g, "#28445f").replace(/#c8cfdb/g, "#0b2038")
  .replace(/#e8edf4/g, "#19334f").replace(/#eef2f7/g, "#213d59")
  .replace(/#aab4c5/g, "#091d32").replace(/#a5adbc/g, "#0a1d33")
  .replace(/#d1d7e2/g, "#18324e").replace(/#d8dfe9|#d7dde7/g, "#24405c");
await writeFile(resolve(destination, "vx4-logo-light.svg"), light);

function onBackground(svg, color) {
  return svg.replace(/(<svg\b[^>]*>)/, `$1<rect x="80" y="20" width="900" height="400" fill="${color}"/>`);
}
for (const [name, svg] of [["vx4-logo-transparent", source], ["vx4-logo-white", onBackground(light, "#ffffff")], ["vx4-logo-black", onBackground(source, "#000000")]]) {
  await writeFile(resolve(destination, `${name}.svg`), svg);
  let output = sharp(Buffer.from(svg)).resize({ width: 3600 });
  if (name.endsWith("white")) output = output.flatten({ background: "#ffffff" });
  if (name.endsWith("black")) output = output.flatten({ background: "#000000" });
  await output.png().toFile(resolve(destination, `${name}.png`));
}

// A filled blue underside and flat letters retain the silhouette at icon sizes.
const flat = source.replace(/fill="url\(#(?:front|back|fold)\)"/g, 'fill="#ffffff"')
  .replace(/fill="url\(#blue\)"/g, 'fill="#0985ff"')
  .replace(/fill="url\(#lime\)"/g, 'fill="#b9f900"');
// Keep all artwork inside the maskable icon's central 80% safe circle.
const artwork = flat.slice(flat.indexOf("<defs>"), flat.lastIndexOf("</svg>"));
const square = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#07182c"/><g transform="translate(152 352) scale(.8) translate(-80 -20)">${artwork}</g></svg>`;
await writeFile(resolve(destination, "vx4-app.svg"), square);
await sharp(Buffer.from(square)).resize(1024, 1024).png().toFile(resolve(destination, "vx4-app.png"));
for (const size of [192, 512]) await sharp(Buffer.from(square)).resize(size, size).png().toFile(resolve(destination, `vx4-app-${size}.png`));
await sharp(Buffer.from(square)).resize(1080, 1080).png().toFile(resolve(destination, "vx4-instagram.png"));
await writeFile(resolve(root, "public/icon.svg"), square);
await sharp(Buffer.from(square)).resize(64, 64).png().toFile(resolve(destination, "vx4-favicon.png"));
const apple = await sharp(Buffer.from(square)).resize(180, 180).png().toBuffer();
for (const name of ["apple-touch-icon.png", "apple-touch-icon-precomposed.png"]) await writeFile(resolve(root, `public/${name}`), apple);
const sizes = [16, 32, 48, 64];
const pngs = await Promise.all(sizes.map(size => sharp(Buffer.from(square)).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + pngs.length * 16);
header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
let offset = header.length;
pngs.forEach((png, i) => {
  const entry = 6 + i * 16;
  header[entry] = sizes[i]; header[entry + 1] = sizes[i];
  header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(png.length, entry + 8); header.writeUInt32LE(offset, entry + 12);
  offset += png.length;
});
await writeFile(resolve(root, "public/favicon.ico"), Buffer.concat([header, ...pngs]));
