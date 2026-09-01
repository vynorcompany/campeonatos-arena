CREATE TABLE "ClassGroup" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  CONSTRAINT "ClassGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassGroupSchedule" (
  "id" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  "classGroupId" TEXT NOT NULL,
  CONSTRAINT "ClassGroupSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassGroupPlan" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "classGroupId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  CONSTRAINT "ClassGroupPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassGroupEnrollment" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  "classGroupId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  CONSTRAINT "ClassGroupEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassGroupRequest" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "message" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  "classGroupId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  CONSTRAINT "ClassGroupRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassGroup_arenaId_name_key" ON "ClassGroup"("arenaId", "name");
CREATE INDEX "ClassGroup_arenaId_active_idx" ON "ClassGroup"("arenaId", "active");
CREATE INDEX "ClassGroup_teacherId_active_idx" ON "ClassGroup"("teacherId", "active");
CREATE UNIQUE INDEX "ClassGroupSchedule_classGroupId_weekday_startTime_key" ON "ClassGroupSchedule"("classGroupId", "weekday", "startTime");
CREATE INDEX "ClassGroupSchedule_arenaId_weekday_idx" ON "ClassGroupSchedule"("arenaId", "weekday");
CREATE UNIQUE INDEX "ClassGroupPlan_classGroupId_planId_key" ON "ClassGroupPlan"("classGroupId", "planId");
CREATE INDEX "ClassGroupPlan_planId_idx" ON "ClassGroupPlan"("planId");
CREATE UNIQUE INDEX "ClassGroupEnrollment_classGroupId_studentId_key" ON "ClassGroupEnrollment"("classGroupId", "studentId");
CREATE INDEX "ClassGroupEnrollment_arenaId_status_idx" ON "ClassGroupEnrollment"("arenaId", "status");
CREATE INDEX "ClassGroupEnrollment_studentId_status_idx" ON "ClassGroupEnrollment"("studentId", "status");
CREATE INDEX "ClassGroupRequest_arenaId_status_idx" ON "ClassGroupRequest"("arenaId", "status");
CREATE INDEX "ClassGroupRequest_classGroupId_status_idx" ON "ClassGroupRequest"("classGroupId", "status");
CREATE INDEX "ClassGroupRequest_studentId_status_idx" ON "ClassGroupRequest"("studentId", "status");

ALTER TABLE "ClassGroup" ADD CONSTRAINT "ClassGroup_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassGroup" ADD CONSTRAINT "ClassGroup_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassGroupSchedule" ADD CONSTRAINT "ClassGroupSchedule_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassGroupSchedule" ADD CONSTRAINT "ClassGroupSchedule_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassGroupPlan" ADD CONSTRAINT "ClassGroupPlan_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassGroupPlan" ADD CONSTRAINT "ClassGroupPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassGroupEnrollment" ADD CONSTRAINT "ClassGroupEnrollment_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassGroupEnrollment" ADD CONSTRAINT "ClassGroupEnrollment_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassGroupEnrollment" ADD CONSTRAINT "ClassGroupEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassGroupRequest" ADD CONSTRAINT "ClassGroupRequest_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassGroupRequest" ADD CONSTRAINT "ClassGroupRequest_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassGroupRequest" ADD CONSTRAINT "ClassGroupRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ClassGroupMakeup" (
  "id" TEXT NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "arenaId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "sourceClassGroupId" TEXT NOT NULL,
  "destinationClassGroupId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  CONSTRAINT "ClassGroupMakeup_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClassGroupMakeup_arenaId_scheduledFor_idx" ON "ClassGroupMakeup"("arenaId", "scheduledFor");
CREATE INDEX "ClassGroupMakeup_studentId_scheduledFor_idx" ON "ClassGroupMakeup"("studentId", "scheduledFor");
CREATE INDEX "ClassGroupMakeup_destinationClassGroupId_scheduledFor_idx" ON "ClassGroupMakeup"("destinationClassGroupId", "scheduledFor");
ALTER TABLE "ClassGroupMakeup" ADD CONSTRAINT "ClassGroupMakeup_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassGroupMakeup" ADD CONSTRAINT "ClassGroupMakeup_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassGroupMakeup" ADD CONSTRAINT "ClassGroupMakeup_sourceClassGroupId_fkey" FOREIGN KEY ("sourceClassGroupId") REFERENCES "ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassGroupMakeup" ADD CONSTRAINT "ClassGroupMakeup_destinationClassGroupId_fkey" FOREIGN KEY ("destinationClassGroupId") REFERENCES "ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassGroupMakeup" ADD CONSTRAINT "ClassGroupMakeup_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
