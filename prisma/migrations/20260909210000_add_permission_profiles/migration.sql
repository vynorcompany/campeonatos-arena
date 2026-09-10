CREATE TABLE "PermissionProfile" (
  "id" TEXT NOT NULL,
  "arenaId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "viewPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "editPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PermissionProfile_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ArenaMember" ADD COLUMN "permissionProfileId" TEXT;

CREATE UNIQUE INDEX "PermissionProfile_arenaId_name_key" ON "PermissionProfile"("arenaId", "name");
CREATE INDEX "PermissionProfile_arenaId_active_idx" ON "PermissionProfile"("arenaId", "active");
CREATE INDEX "ArenaMember_permissionProfileId_idx" ON "ArenaMember"("permissionProfileId");

ALTER TABLE "PermissionProfile"
  ADD CONSTRAINT "PermissionProfile_arenaId_fkey"
  FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArenaMember"
  ADD CONSTRAINT "ArenaMember_permissionProfileId_fkey"
  FOREIGN KEY ("permissionProfileId") REFERENCES "PermissionProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
