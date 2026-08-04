import assert from "node:assert/strict";
import test from "node:test";
import { buildArenaProfileUpdateData } from "@/lib/arena-profile";
import { toPersistentArenaLogo } from "@/lib/uploads";

const profile = {
  name: "Arena Central",
  legalName: "Arena Central LTDA",
  cnpj: "12.345.678/0001-90",
  phone: "(11) 99999-9999",
  email: "contato@arena.test",
  address: "Rua da Arena, 100",
  city: "Sao Paulo",
  state: "SP",
  zipCode: "01000-000"
};

test("buildArenaProfileUpdateData returns a Prisma payload with a persistent PNG data URL", async () => {
  const file = new File([new Uint8Array([137, 80, 78, 71])], "arena.png", { type: "image/png" });

  const data = await buildArenaProfileUpdateData(profile, file);

  assert.deepEqual({ ...data, logoUrl: undefined }, { ...profile, logoUrl: undefined });
  assert.match(data.logoUrl ?? "", /^data:image\/png;base64,/);
});

test("buildArenaProfileUpdateData preserves profile fields and omits logoUrl without a file", async () => {
  const data = await buildArenaProfileUpdateData(profile, null);

  assert.deepEqual(data, profile);
  assert.equal("logoUrl" in data, false);
});

test("Arena logo rejects files larger than 500 KB", async () => {
  const file = new File([new Uint8Array(500 * 1024 + 1)], "arena.png", { type: "image/png" });

  await assert.rejects(
    toPersistentArenaLogo(file),
    new Error("A imagem deve ter no máximo 500 KB.")
  );
});
