import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("avatar upload keeps the selected image available while crop rendering is still running", () => {
  const component = readFileSync(resolve(process.cwd(), "src/components/avatar-crop-field.tsx"), "utf8");
  const pairForm = readFileSync(resolve(process.cwd(), "src/components/tournaments/category-pair-form.tsx"), "utf8");

  assert.match(component, /outputRef\.current\.files\s*=\s*data\.files/);
  assert.match(component, /const selectImage[\s\S]*outputRef\.current\.files\s*=\s*data\.files/);
  assert.match(pairForm, /SafeActionForm action=\{addManualPairAction\}/);
});

test("foto de atleta é persistida fora do filesystem efêmero do deploy", () => {
  const uploads = readFileSync(resolve(process.cwd(), "src/lib/uploads.ts"), "utf8");
  const profileAction = readFileSync(resolve(process.cwd(), "src/lib/actions/public-player-profile.ts"), "utf8");
  const managementAction = readFileSync(resolve(process.cwd(), "src/lib/actions/tournament.ts"), "utf8");

  assert.match(uploads, /toPersistentPlayerPhoto/);
  assert.match(profileAction, /toPersistentPlayerPhoto/);
  assert.doesNotMatch(profileAction, /savePublicImageUpload/);
  assert.match(managementAction, /toPersistentPlayerPhoto/);
});

test("portal troca uma foto legada ausente pelas iniciais do atleta", () => {
  const portal = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-standings.tsx"), "utf8");

  assert.match(portal, /PlayerAvatar/);
  assert.match(portal, /athlete-portal-user-avatar/);
});

test("avatar do cabeçalho tenta novamente quando a foto do perfil muda", () => {
  const avatar = readFileSync(resolve(process.cwd(), "src/components/player-avatar.tsx"), "utf8");
  const profile = readFileSync(resolve(process.cwd(), "src/components/public-player-profile.tsx"), "utf8");

  assert.match(avatar, /useEffect/);
  assert.match(avatar, /\[photoUrl\]/);
  assert.match(profile, /router\.refresh/);
});
