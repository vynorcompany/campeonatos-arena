import 'server-only';
import { financialSettingsAreaSchema, financialSettingsPageSchema } from '@/lib/backend/contracts/financial-settings';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { readBackendContract } from '@/lib/backend/http-client';
export async function getFinancialSettingsPage(arenaId: string, areaValue: string) {
  const area = financialSettingsAreaSchema.parse(areaValue);
  const origin = process.env.VX4_BACKEND_ORIGIN;
  const data = origin ? await readBackendContract(origin, `/api/management/finance/settings/${area}`, financialSettingsPageSchema, { cookie: (await managementCookieHeader()) ?? '' }, { timeoutMs: 60000 })
    : await (await import('@/lib/backend/services/financial-settings')).resolveFinancialSettingsPage(arenaId, area);
  return { ...data, coupons: data.coupons.map(coupon => ({ ...coupon, startsAt: coupon.startsAt ? new Date(coupon.startsAt) : null, endsAt: coupon.endsAt ? new Date(coupon.endsAt) : null })) };
}
