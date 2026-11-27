import { requirePermission, requireModuleView } from "@/lib/auth/guards";
import { getCheckinSettings } from "@/lib/checkin/query";
import { CheckinSettings } from "@/components/courts/checkin-settings";

export default async function CheckinSettingsPage() {
  await requireModuleView("calendar");
  const auth = await requirePermission("calendar:settings:manage");
  const arena = await getCheckinSettings(auth.arenaId);
  return <section className="tw:grid tw:min-w-0 tw:gap-5"><h1 className="tw:sr-only">Check-in e QR Code</h1><CheckinSettings arenaSlug={arena.slug} enabled={arena.checkinEnabled} mode={arena.checkinMode} token={arena.checkinToken} blockOverdueLessons={arena.blockOverdueLessons} /></section>;
}
