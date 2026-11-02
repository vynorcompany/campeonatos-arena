CREATE TABLE "RecoveryCheck" (
 "id" TEXT PRIMARY KEY,
 "status" TEXT NOT NULL,
 "checkedAt" TIMESTAMP(3) NOT NULL,
 "lastSuccessAt" TIMESTAMP(3),
 "errorCode" TEXT NOT NULL DEFAULT ''
);
GRANT SELECT,INSERT,UPDATE ON "RecoveryCheck" TO arena_runtime;
REVOKE DELETE ON "RecoveryCheck" FROM arena_runtime;
