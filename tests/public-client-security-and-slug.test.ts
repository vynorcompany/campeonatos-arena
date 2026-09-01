import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("portal do cliente prepara verificação, recuperação e bloqueio por telefone", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/player-auth.ts"), "utf8");
  const env = readFileSync(resolve(process.cwd(), "src/lib/env.ts"), "utf8");

  assert.match(schema, /model PlayerAuthAttempt \{/);
  assert.match(schema, /model PlayerVerificationCode \{/);
  assert.match(actions, /requestPublicPasswordResetAction/);
  assert.match(actions, /confirmPublicPasswordResetAction/);
  assert.match(actions, /sendEvolutionTextMessage/);
  assert.match(actions, /playerPhoneVerificationRequired/);
  assert.match(env, /PLAYER_PHONE_VERIFICATION_REQUIRED/);
});

test("nome da arena gera endereço público canônico e preserva aliases", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const arenaAction = readFileSync(resolve(process.cwd(), "src/lib/actions/arena.ts"), "utf8");
  const profile = readFileSync(resolve(process.cwd(), "src/lib/arena-profile.ts"), "utf8");

  assert.match(schema, /model ArenaPublicSlug \{/);
  assert.match(arenaAction, /createUniqueArenaSlug/);
  assert.match(arenaAction, /arenaPublicSlug\.upsert/);
  assert.match(arenaAction, /slugifyArenaName\(parsed\.data\.name\) !== currentArena\.slug/);
  assert.match(profile, /slugifyArenaName/);
});
