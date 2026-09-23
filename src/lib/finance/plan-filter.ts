export function teacherPlanCondition(teacherId: string) {
  return { OR: [
    { plan: { teacherAssignments: { some: { teacherId, active: true } } } },
    { recurrence: { plan: { teacherAssignments: { some: { teacherId, active: true } } } } }
  ] };
}
