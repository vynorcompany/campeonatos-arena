ALTER TABLE "LessonAttendance" ADD COLUMN "checkedInAt" TIMESTAMP(3);

CREATE TABLE "StudentMonthlyBalance" (
  "id" TEXT NOT NULL,
  "referenceMonth" TEXT NOT NULL,
  "totalClasses" INTEGER NOT NULL DEFAULT 0,
  "remainingClasses" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  CONSTRAINT "StudentMonthlyBalance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentMonthlyBalance_studentId_referenceMonth_key" ON "StudentMonthlyBalance"("studentId", "referenceMonth");
CREATE INDEX "StudentMonthlyBalance_arenaId_referenceMonth_idx" ON "StudentMonthlyBalance"("arenaId", "referenceMonth");
ALTER TABLE "StudentMonthlyBalance" ADD CONSTRAINT "StudentMonthlyBalance_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentMonthlyBalance" ADD CONSTRAINT "StudentMonthlyBalance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
