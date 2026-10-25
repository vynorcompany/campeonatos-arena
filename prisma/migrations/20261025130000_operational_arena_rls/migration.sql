-- Tenant scope for schedules, teaching and Portal content. Public views enter an explicit arena transaction.
ALTER TABLE "Court" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Court" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Court" TO arena_runtime;
CREATE POLICY "arena_scope_court" ON "Court" USING ("arenaId" = (SELECT public.current_arena_id())) WITH CHECK ("arenaId" = (SELECT public.current_arena_id()));

ALTER TABLE "BookingType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BookingType" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "BookingType" TO arena_runtime;
CREATE POLICY "arena_scope_bookingtype" ON "BookingType" USING ("arenaId" = (SELECT public.current_arena_id())) WITH CHECK ("arenaId" = (SELECT public.current_arena_id()));

ALTER TABLE "ScheduleBookingSeries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScheduleBookingSeries" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ScheduleBookingSeries" TO arena_runtime;
CREATE POLICY "arena_scope_schedulebookingseries" ON "ScheduleBookingSeries" USING ("arenaId" = (SELECT public.current_arena_id())) WITH CHECK ("arenaId" = (SELECT public.current_arena_id()));

ALTER TABLE "CalendarEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CalendarEvent" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "CalendarEvent" TO arena_runtime;
CREATE POLICY "arena_scope_calendarevent" ON "CalendarEvent" USING ("arenaId" = (SELECT public.current_arena_id())) WITH CHECK ("arenaId" = (SELECT public.current_arena_id()));

ALTER TABLE "PortalAnnouncement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PortalAnnouncement" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "PortalAnnouncement" TO arena_runtime;
CREATE POLICY "arena_scope_portalannouncement" ON "PortalAnnouncement" USING ("arenaId" = (SELECT public.current_arena_id())) WITH CHECK ("arenaId" = (SELECT public.current_arena_id()));

ALTER TABLE "PortalEventPost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PortalEventPost" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "PortalEventPost" TO arena_runtime;
CREATE POLICY "arena_scope_portaleventpost" ON "PortalEventPost" USING ("arenaId" = (SELECT public.current_arena_id())) WITH CHECK ("arenaId" = (SELECT public.current_arena_id()));

ALTER TABLE "Teacher" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Teacher" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Teacher" TO arena_runtime;
CREATE POLICY "arena_scope_teacher" ON "Teacher" USING ("arenaId" = (SELECT public.current_arena_id())) WITH CHECK ("arenaId" = (SELECT public.current_arena_id()) AND ("playerId" IS NULL OR EXISTS (SELECT 1 FROM "Player" p WHERE p.id = "Teacher"."playerId" AND p."arenaId" = (SELECT public.current_arena_id()))));

ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Student" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Student" TO arena_runtime;
CREATE POLICY "arena_scope_student" ON "Student" USING ("arenaId" = (SELECT public.current_arena_id())) WITH CHECK ("arenaId" = (SELECT public.current_arena_id()) AND ("playerId" IS NULL OR EXISTS (SELECT 1 FROM "Player" p WHERE p.id = "Student"."playerId" AND p."arenaId" = (SELECT public.current_arena_id()))));

ALTER TABLE "Lesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lesson" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Lesson" TO arena_runtime;
CREATE POLICY "arena_scope_lesson" ON "Lesson" USING ("arenaId" = (SELECT public.current_arena_id())) WITH CHECK ("arenaId" = (SELECT public.current_arena_id()) AND ("teacherId" IS NULL OR EXISTS (SELECT 1 FROM "Teacher" p WHERE p.id = "Lesson"."teacherId" AND p."arenaId" = (SELECT public.current_arena_id()))));

ALTER TABLE "Plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Plan" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Plan" TO arena_runtime;
CREATE POLICY "arena_scope_plan" ON "Plan" USING ("arenaId" = (SELECT public.current_arena_id())) WITH CHECK ("arenaId" = (SELECT public.current_arena_id()));

ALTER TABLE "ClassGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassGroup" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ClassGroup" TO arena_runtime;
CREATE POLICY "arena_scope_classgroup" ON "ClassGroup" USING ("arenaId" = (SELECT public.current_arena_id())) WITH CHECK ("arenaId" = (SELECT public.current_arena_id()) AND EXISTS (SELECT 1 FROM "Teacher" p WHERE p.id = "ClassGroup"."teacherId" AND p."arenaId" = (SELECT public.current_arena_id())));

ALTER TABLE "ClassGroupSchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassGroupSchedule" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ClassGroupSchedule" TO arena_runtime;
CREATE POLICY "arena_scope_classgroupschedule" ON "ClassGroupSchedule" USING ("arenaId" = (SELECT public.current_arena_id())) WITH CHECK ("arenaId" = (SELECT public.current_arena_id()) AND EXISTS (SELECT 1 FROM "ClassGroup" p WHERE p.id = "ClassGroupSchedule"."classGroupId" AND p."arenaId" = (SELECT public.current_arena_id())));

ALTER TABLE "ClassGroupEnrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassGroupEnrollment" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ClassGroupEnrollment" TO arena_runtime;
CREATE POLICY "arena_scope_classgroupenrollment" ON "ClassGroupEnrollment" USING ("arenaId" = (SELECT public.current_arena_id())) WITH CHECK ("arenaId" = (SELECT public.current_arena_id()) AND EXISTS (SELECT 1 FROM "ClassGroup" p WHERE p.id = "ClassGroupEnrollment"."classGroupId" AND p."arenaId" = (SELECT public.current_arena_id())) AND EXISTS (SELECT 1 FROM "Student" p WHERE p.id = "ClassGroupEnrollment"."studentId" AND p."arenaId" = (SELECT public.current_arena_id())));

ALTER TABLE "ClassGroupRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassGroupRequest" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ClassGroupRequest" TO arena_runtime;
CREATE POLICY "arena_scope_classgrouprequest" ON "ClassGroupRequest" USING ("arenaId" = (SELECT public.current_arena_id())) WITH CHECK ("arenaId" = (SELECT public.current_arena_id()) AND EXISTS (SELECT 1 FROM "ClassGroup" p WHERE p.id = "ClassGroupRequest"."classGroupId" AND p."arenaId" = (SELECT public.current_arena_id())) AND EXISTS (SELECT 1 FROM "Student" p WHERE p.id = "ClassGroupRequest"."studentId" AND p."arenaId" = (SELECT public.current_arena_id())));

ALTER TABLE "ClassGroupMakeup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassGroupMakeup" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ClassGroupMakeup" TO arena_runtime;
CREATE POLICY "arena_scope_classgroupmakeup" ON "ClassGroupMakeup" USING ("arenaId" = (SELECT public.current_arena_id())) WITH CHECK ("arenaId" = (SELECT public.current_arena_id()) AND EXISTS (SELECT 1 FROM "ClassGroup" p WHERE p.id = "ClassGroupMakeup"."sourceClassGroupId" AND p."arenaId" = (SELECT public.current_arena_id())) AND EXISTS (SELECT 1 FROM "ClassGroup" p WHERE p.id = "ClassGroupMakeup"."destinationClassGroupId" AND p."arenaId" = (SELECT public.current_arena_id())) AND EXISTS (SELECT 1 FROM "Student" p WHERE p.id = "ClassGroupMakeup"."studentId" AND p."arenaId" = (SELECT public.current_arena_id())) AND EXISTS (SELECT 1 FROM "Teacher" p WHERE p.id = "ClassGroupMakeup"."teacherId" AND p."arenaId" = (SELECT public.current_arena_id())));

ALTER TABLE "TeacherStudent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherStudent" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "TeacherStudent" TO arena_runtime;
CREATE POLICY "arena_scope_teacherstudent" ON "TeacherStudent" USING ("arenaId" = (SELECT public.current_arena_id())) WITH CHECK ("arenaId" = (SELECT public.current_arena_id()) AND EXISTS (SELECT 1 FROM "Teacher" p WHERE p.id = "TeacherStudent"."teacherId" AND p."arenaId" = (SELECT public.current_arena_id())) AND EXISTS (SELECT 1 FROM "Student" p WHERE p.id = "TeacherStudent"."studentId" AND p."arenaId" = (SELECT public.current_arena_id())));

ALTER TABLE "TeacherPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherPlan" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "TeacherPlan" TO arena_runtime;
CREATE POLICY "arena_scope_teacherplan" ON "TeacherPlan" USING ("arenaId" = (SELECT public.current_arena_id())) WITH CHECK ("arenaId" = (SELECT public.current_arena_id()) AND EXISTS (SELECT 1 FROM "Teacher" p WHERE p.id = "TeacherPlan"."teacherId" AND p."arenaId" = (SELECT public.current_arena_id())) AND EXISTS (SELECT 1 FROM "Plan" p WHERE p.id = "TeacherPlan"."planId" AND p."arenaId" = (SELECT public.current_arena_id())));

ALTER TABLE "StudentMonthlyBalance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentMonthlyBalance" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "StudentMonthlyBalance" TO arena_runtime;
CREATE POLICY "arena_scope_studentmonthlybalance" ON "StudentMonthlyBalance" USING ("arenaId" = (SELECT public.current_arena_id())) WITH CHECK ("arenaId" = (SELECT public.current_arena_id()) AND EXISTS (SELECT 1 FROM "Student" p WHERE p.id = "StudentMonthlyBalance"."studentId" AND p."arenaId" = (SELECT public.current_arena_id())));

ALTER TABLE "CourtWeeklyRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourtWeeklyRule" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "CourtWeeklyRule" TO arena_runtime;
CREATE POLICY "arena_scope_courtweeklyrule" ON "CourtWeeklyRule" USING (EXISTS (SELECT 1 FROM "Court" p WHERE p.id = "CourtWeeklyRule"."courtId" AND p."arenaId" = (SELECT public.current_arena_id()))) WITH CHECK (EXISTS (SELECT 1 FROM "Court" p WHERE p.id = "CourtWeeklyRule"."courtId" AND p."arenaId" = (SELECT public.current_arena_id())));

ALTER TABLE "ClassGroupPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassGroupPlan" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ClassGroupPlan" TO arena_runtime;
CREATE POLICY "arena_scope_classgroupplan" ON "ClassGroupPlan" USING (EXISTS (SELECT 1 FROM "ClassGroup" p WHERE p.id = "ClassGroupPlan"."classGroupId" AND p."arenaId" = (SELECT public.current_arena_id())) AND EXISTS (SELECT 1 FROM "Plan" p WHERE p.id = "ClassGroupPlan"."planId" AND p."arenaId" = (SELECT public.current_arena_id()))) WITH CHECK (EXISTS (SELECT 1 FROM "ClassGroup" p WHERE p.id = "ClassGroupPlan"."classGroupId" AND p."arenaId" = (SELECT public.current_arena_id())) AND EXISTS (SELECT 1 FROM "Plan" p WHERE p.id = "ClassGroupPlan"."planId" AND p."arenaId" = (SELECT public.current_arena_id())));

ALTER TABLE "LessonAttendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LessonAttendance" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "LessonAttendance" TO arena_runtime;
CREATE POLICY "arena_scope_lessonattendance" ON "LessonAttendance" USING (EXISTS (SELECT 1 FROM "Lesson" p WHERE p.id = "LessonAttendance"."lessonId" AND p."arenaId" = (SELECT public.current_arena_id())) AND EXISTS (SELECT 1 FROM "Student" p WHERE p.id = "LessonAttendance"."studentId" AND p."arenaId" = (SELECT public.current_arena_id()))) WITH CHECK (EXISTS (SELECT 1 FROM "Lesson" p WHERE p.id = "LessonAttendance"."lessonId" AND p."arenaId" = (SELECT public.current_arena_id())) AND EXISTS (SELECT 1 FROM "Student" p WHERE p.id = "LessonAttendance"."studentId" AND p."arenaId" = (SELECT public.current_arena_id())));

