import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("portal editorial management lives inside Dados da arena > Portal do Atleta", () => {
  const arenaPage = read("src/app/(app)/arena/page.tsx");
  const legacyPage = read("src/app/(app)/arena/portal-cliente/page.tsx");
  const shell = read("src/components/layout/app-shell.tsx");

  assert.match(arenaPage, /PortalEditorPanels/);
  assert.match(arenaPage, /activeSection === "portal"/);
  assert.match(legacyPage, /redirect\("\/arena\?section=portal"\)/);
  assert.match(shell, /href="\/arena"[^>]*>Configurações/);
  assert.doesNotMatch(shell, /Portal do Cliente/);
  assert.doesNotMatch(shell, /Configuração de quadras/);
});

test("portal editorial dialogs use a responsive form and allow replacing a broken event image", () => {
  const editor = read("src/components/portal-editor-panels.tsx");
  const actions = read("src/lib/actions/client-portal.ts");
  const styles = read("src/app/globals.css");

  assert.match(editor, /portal-editor-dialog/);
  assert.match(editor, /portal-editor-form/);
  assert.match(editor, /portal-upload-field/);
  assert.match(editor, /Trocar imagem/);
  assert.match(actions, /replacePortalEventPostImageAction/);
  assert.match(styles, /\.portal-editor-form \{[\s\S]*grid-template-columns: repeat\(2/);
  assert.match(styles, /@media \(max-width: 620px\) \{[\s\S]*\.portal-editor-form/);
});

test("portal event images are normalized to a lightweight vertical WebP before R2 upload", () => {
  const uploads = read("src/lib/uploads.ts");
  const packageJson = read("package.json");

  assert.match(packageJson, /"sharp"/);
  assert.match(uploads, /import sharp from "sharp"/);
  assert.match(uploads, /resize\(\{ width: 1080, height: 1920, fit: "cover"/);
  assert.match(uploads, /webp\(\{ quality: 82/);
  assert.match(uploads, /image\/webp/);
});
