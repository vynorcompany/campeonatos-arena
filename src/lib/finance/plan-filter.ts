export function teacherPlanCondition(teacherId: string) {
  // Older charges did not store their teacher. A shared plan cannot establish
  // ownership, so show a legacy charge only while the plan has one active teacher.
  const unambiguousLegacyPlan = { teacherAssignments: {
    some: { teacherId, active: true },
    none: { active: true, teacherId: { not: teacherId } },
  } };
  return { OR: [
    { teacherId },
    { teacherId: null, recurrence: { teacherId } },
    { teacherId: null, plan: unambiguousLegacyPlan },
    { teacherId: null, recurrence: { plan: unambiguousLegacyPlan } },
  ] };
}
