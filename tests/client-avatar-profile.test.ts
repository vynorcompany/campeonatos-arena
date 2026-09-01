import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("cliente recorta avatar antes de salvar e visualiza a prévia circular", () => {
  const cropper = resolve(process.cwd(), "src/components/avatar-crop-field.tsx");
  const profile = readFileSync(resolve(process.cwd(), "src/components/public-player-profile.tsx"), "utf8");

  assert.ok(existsSync(cropper));
  const source = readFileSync(cropper, "utf8");
  assert.match(source, /canvas\.getContext/);
  assert.match(source, /Zoom/);
  assert.match(source, /onPointerMove/);
  assert.match(profile, /AvatarCropField/);
});

test("modal de Cliente recebe e mostra a mesma foto de perfil", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/jogadores/page.tsx"), "utf8");
  const workspace = readFileSync(resolve(process.cwd(), "src/components/players/client-management-workspace.tsx"), "utf8");

  assert.match(page, /photoUrl: player\.photoUrl/);
  assert.match(workspace, /photoUrl: string/);
  assert.match(workspace, /client-avatar/);
});
