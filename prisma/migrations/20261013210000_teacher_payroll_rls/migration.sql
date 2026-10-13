-- Historical payroll amounts are private to the teacher's arena. Keep
-- existing own-arena rows readable; reject new cross-arena teacher links.
ALTER TABLE "TeacherPayrollEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherPayrollEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_teacher_payroll" ON "TeacherPayrollEntry"
  USING ("arenaId" = public.current_arena_id())
  WITH CHECK (
    "arenaId" = public.current_arena_id()
    AND EXISTS (
      SELECT 1 FROM "Teacher" t
      WHERE t.id = "TeacherPayrollEntry"."teacherId"
        AND t."arenaId" = "TeacherPayrollEntry"."arenaId"
    )
  );
