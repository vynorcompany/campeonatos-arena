import { requirePermission, requireModuleView } from "@/lib/auth/guards";
import { arenaDatabase } from "@/lib/arena-database";
import { CheckinSettings } from "@/components/courts/checkin-settings";

export default async function CheckinSettingsPage() {
  await requireModuleView("calendar");
  const auth = await requirePermission("calendar:settings:manage");
  const arena = await arenaDatabase(auth.arenaId).arena.findUniqueOrThrow({ where: { id: auth.arenaId }, select: { slug: true, checkinEnabled: true, checkinToken: true } });
  return <section className="tw:grid tw:min-w-0 tw:gap-5"><header><h1 className="tw:m-0 tw:text-2xl tw:font-semibold">Check-in e QR Code</h1><p className="tw:text-sm tw:text-[var(--muted)]">Um único código para a presença nas reservas de quadra e nas aulas.</p></header><CheckinSettings arenaSlug={arena.slug} enabled={arena.checkinEnabled} token={arena.checkinToken} /></section>;
}
