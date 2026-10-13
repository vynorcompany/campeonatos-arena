import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { defaultArenaPermissionProfiles, defaultPermissionsForRole, normalizePermissionModules } from "../src/lib/permissions";

test("perfil legado é vinculado de forma idempotente mesmo após criação interrompida", async () => {
  const source = readFileSync(new URL("../src/lib/actions/permission-profile.ts", import.meta.url), "utf8");
  const require = createRequire(import.meta.url);
  const members = [
    { id: "member-a", role: "OWNER", viewPermissions: [], editPermissions: [], permissionProfileId: null as string | null },
    { id: "member-b", role: "STAFF", viewPermissions: ["calendar"], editPermissions: ["calendar"], permissionProfileId: null as string | null },
  ];
  const profiles = new Map<string, string>([["arena-a:Migrado · OWNER 1", "legacy-orphan"]]);
  const prisma = {
    permissionProfile: {
      createMany: async () => ({ count: 0 }),
      upsert: async ({ where }: { where: { arenaId_name: { arenaId: string; name: string } } }) => {
        const key = `${where.arenaId_name.arenaId}:${where.arenaId_name.name}`;
        if (!profiles.has(key)) profiles.set(key, `profile-${profiles.size}`);
        return { id: profiles.get(key) };
      },
    },
    arenaMember: {
      findMany: async () => members.filter((member) => member.permissionProfileId === null).map((member) => ({ ...member })),
      updateMany: async ({ where, data }: { where: { id: string; arenaId: string; permissionProfileId: null }; data: { permissionProfileId: string } }) => {
        const member = members.find((item) => item.id === where.id && item.permissionProfileId === null);
        if (!member) return { count: 0 };
        member.permissionProfileId = data.permissionProfileId;
        return { count: 1 };
      },
    },
  };
  const exports: Record<string, (arenaId: string) => Promise<void>> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    require: (name: string) => {
      if (name === "next/cache") return { revalidatePath() {} };
      if (name === "next/navigation") return { redirect() {} };
      if (name === "@/lib/auth/guards") return { requireRole() {} };
      if (name === "@/lib/prisma") return { prisma };
      if (name === "@/lib/permissions") return { defaultArenaPermissionProfiles, defaultPermissionsForRole, normalizePermissionModules };
      return require(name);
    },
  });

  await Promise.all([exports.ensureArenaPermissionProfiles("arena-a"), exports.ensureArenaPermissionProfiles("arena-a")]);
  await exports.ensureArenaPermissionProfiles("arena-a");
  assert.equal(profiles.get("arena-a:Migrado · OWNER 1"), "legacy-orphan");
  assert.ok(members.every((member) => member.permissionProfileId));
  assert.notEqual(members[0].permissionProfileId, members[1].permissionProfileId);
  assert.equal(profiles.size, 3);
});
