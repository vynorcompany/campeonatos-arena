ALTER TABLE "Plan" ADD COLUMN "creditExpiryCycle" TEXT NOT NULL DEFAULT 'MONTHLY', ADD COLUMN "creditExpiryDays" INTEGER, ADD COLUMN "creditPolicyConfiguredAt" TIMESTAMP(3);
ALTER TABLE "ArenaOperationalSettings" ADD COLUMN "whatsappPaidMessage" TEXT NOT NULL DEFAULT '', ADD COLUMN "whatsappUnpaidMessage" TEXT NOT NULL DEFAULT '', ADD COLUMN "lessonMakeupEnabled" BOOLEAN NOT NULL DEFAULT TRUE, ADD COLUMN "lessonMakeupLeadHours" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "lessonMakeupValidityDays" INTEGER NOT NULL DEFAULT 30, ADD COLUMN "lessonMakeupMonthEnd" BOOLEAN NOT NULL DEFAULT TRUE, ADD COLUMN "lessonMakeupPolicy" TEXT NOT NULL DEFAULT '', ADD COLUMN "lessonCreditNoticeDays" INTEGER NOT NULL DEFAULT 7;
UPDATE "ArenaOperationalSettings" SET "whatsappPaidMessage"="whatsappMessage", "whatsappUnpaidMessage"="whatsappMessage";
CREATE UNIQUE INDEX "Student_arenaId_id_key" ON "Student"("arenaId","id");
CREATE TABLE "LessonCreditBatch" (
 "id" TEXT PRIMARY KEY, "arenaId" TEXT NOT NULL, "studentId" TEXT NOT NULL,
 "sourceKey" TEXT NOT NULL, "granted" INTEGER NOT NULL CHECK ("granted">=0), "remaining" INTEGER NOT NULL CHECK ("remaining">=0 AND "remaining"<="granted"),
 "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3),
 FOREIGN KEY ("arenaId","studentId") REFERENCES "Student"("arenaId","id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LessonCreditBatch_arenaId_id_key" ON "LessonCreditBatch"("arenaId","id");
CREATE UNIQUE INDEX "LessonCreditBatch_studentId_id_key" ON "LessonCreditBatch"("studentId","id");
CREATE UNIQUE INDEX "LessonCreditBatch_studentId_sourceKey_key" ON "LessonCreditBatch"("studentId","sourceKey");
CREATE INDEX "LessonCreditBatch_arenaId_studentId_expiresAt_idx" ON "LessonCreditBatch"("arenaId","studentId","expiresAt");
ALTER TABLE "LessonAttendance" ADD COLUMN "creditBatchId" TEXT;
ALTER TABLE "LessonAttendance" ADD CONSTRAINT "LessonAttendance_credit_batch_student_fkey" FOREIGN KEY ("studentId","creditBatchId") REFERENCES "LessonCreditBatch"("studentId","id") ON DELETE NO ACTION ON UPDATE CASCADE;
CREATE TABLE "LessonCreditRequest" (
 "id" TEXT PRIMARY KEY, "arenaId" TEXT NOT NULL, "batchId" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','APPROVED','REJECTED')), "message" TEXT NOT NULL DEFAULT '', "response" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolvedAt" TIMESTAMP(3),
 FOREIGN KEY ("arenaId","batchId") REFERENCES "LessonCreditBatch"("arenaId","id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LessonCreditRequest_batchId_key" ON "LessonCreditRequest"("batchId");
CREATE INDEX "LessonCreditRequest_arenaId_status_createdAt_idx" ON "LessonCreditRequest"("arenaId","status","createdAt");
ALTER TABLE "LessonCreditBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LessonCreditBatch" FORCE ROW LEVEL SECURITY;
ALTER TABLE "LessonCreditRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LessonCreditRequest" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "LessonCreditBatch", "LessonCreditRequest" TO arena_runtime;
CREATE POLICY "arena_scope_lessoncreditbatch" ON "LessonCreditBatch" USING ("arenaId"=public.current_arena_id()) WITH CHECK ("arenaId"=public.current_arena_id() AND EXISTS (SELECT 1 FROM "Student" s WHERE s.id="LessonCreditBatch"."studentId" AND s."arenaId"=public.current_arena_id()));
CREATE POLICY "arena_scope_lessoncreditrequest" ON "LessonCreditRequest" USING ("arenaId"=public.current_arena_id()) WITH CHECK ("arenaId"=public.current_arena_id() AND EXISTS (SELECT 1 FROM "LessonCreditBatch" b WHERE b.id="LessonCreditRequest"."batchId" AND b."arenaId"=public.current_arena_id()));

CREATE UNIQUE INDEX "LessonCreditRequest_arenaId_batchId_key" ON "LessonCreditRequest"("arenaId","batchId");
