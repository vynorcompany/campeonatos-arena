import { instantToArenaWallClock } from '@/lib/calendar/arena-wall-clock';
import type { TeacherDetailQuery } from '@/lib/backend/contracts/teacher-detail';
export function teacherDetailDateInput(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
export function teacherDetailPeriod(query: TeacherDetailQuery, instant = new Date()) {
  const now = instantToArenaWallClock(instant);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { now, monthStart, monthEnd, reportStart: query.inicio ? new Date(`${query.inicio}T00:00:00`) : monthStart, reportEnd: query.fim ? new Date(`${query.fim}T23:59:59`) : monthEnd };
}
