import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("portal event uploads reject videos before calling the server action", () => {
  const editor = read("src/components/portal-editor-panels.tsx");

  assert.match(editor, /O arquivo selecionado não é uma imagem/);
  assert.match(editor, /validate=\{validatePortalEventImage\}/);
});

test("portal event actions return human-readable validation errors instead of throwing", () => {
  const actions = read("src/lib/actions/client-portal.ts");

  assert.match(actions, /return \{ error: "Envie uma imagem válida para o evento\." \}/);
});

test("portal notices expose their state and an explicit deactivate action", () => {
  const editor = read("src/components/portal-editor-panels.tsx");

  assert.match(editor, /Aviso ativo/);
  assert.match(editor, /Desativar aviso/);
});
