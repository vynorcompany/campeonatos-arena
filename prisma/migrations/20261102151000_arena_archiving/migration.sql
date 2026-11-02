-- Archiving suspends access without cascading deletion of customer records.
ALTER TABLE "Arena" ADD COLUMN "archivedAt" TIMESTAMP(3);
REVOKE DELETE ON TABLE "Arena" FROM arena_runtime;
