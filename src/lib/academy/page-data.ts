import 'server-only';
import { academyPageDataSchema, type AcademyPage } from '@/lib/backend/contracts/academy-pages';
import { readBackendContract } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
export async function getAcademyPageData(arenaId: string, page: AcademyPage) {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  const data = origin ? await readBackendContract(origin, `/api/management/academy/pages/${page}`, academyPageDataSchema, { cookie: (await managementCookieHeader()) ?? '' }, { timeoutMs: 60000 })
    : await (await import('@/lib/backend/services/academy-pages')).resolveAcademyPage(arenaId, page);
  return { ...data, lessons: data.lessons.map(lesson => ({ ...lesson, scheduledAt: lesson.scheduledAt ? new Date(lesson.scheduledAt) : null })) };
}
