CREATE TABLE "TeacherStudent" (
  "id" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  CONSTRAINT "TeacherStudent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeacherPlan" (
  "id" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  CONSTRAINT "TeacherPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherStudent_teacherId_studentId_key" ON "TeacherStudent"("teacherId", "studentId");
CREATE INDEX "TeacherStudent_arenaId_active_idx" ON "TeacherStudent"("arenaId", "active");
CREATE INDEX "TeacherStudent_studentId_active_idx" ON "TeacherStudent"("studentId", "active");
CREATE UNIQUE INDEX "TeacherPlan_teacherId_planId_key" ON "TeacherPlan"("teacherId", "planId");
CREATE INDEX "TeacherPlan_arenaId_active_idx" ON "TeacherPlan"("arenaId", "active");

ALTER TABLE "TeacherStudent" ADD CONSTRAINT "TeacherStudent_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherStudent" ADD CONSTRAINT "TeacherStudent_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherStudent" ADD CONSTRAINT "TeacherStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherPlan" ADD CONSTRAINT "TeacherPlan_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherPlan" ADD CONSTRAINT "TeacherPlan_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherPlan" ADD CONSTRAINT "TeacherPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
