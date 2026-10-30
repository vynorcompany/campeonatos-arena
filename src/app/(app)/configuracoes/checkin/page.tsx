import { requirePermission, requireModuleView } from "@/lib/auth/guards";
import { arenaDatabase } from "@/lib/arena-database";
import { CheckinSettings } from "@/components/courts/checkin-settings";

export default async function CheckinSettingsPage() {
  await requireModuleView("calendar");
  const auth = await requirePermission("calendar:settings:manage");
  const arena = await arenaDatabase(auth.arenaId).arena.findUniqueOrThrow({ where: { id: auth.arenaId }, select: { slug: true, checkinEnabled: true, checkinToken: true } });
  return <section className="tw:grid tw:min-w-0 tw:gap-5"><h1 className="tw:sr-only">Check-in e QR Code</h1><CheckinSettings arenaSlug={arena.slug} enabled={arena.checkinEnabled} token={arena.checkinToken} /></section>;
}
