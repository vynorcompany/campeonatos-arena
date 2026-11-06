import { PublicBookingView } from "@/components/public-booking-view";
import { BookingDateTransition } from "@/components/portal/booking-date-transition";
import { PortalTheme } from "@/components/portal/portal-theme";
import { loadPublicBookingDate } from "@/lib/actions/public-booking-view";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./public-booking-content.utilities";

type PublicBookingContentProps = { arenaSlug: string; date?: string; matchId?: string; embedded?: boolean };

export async function PublicBookingContent({ arenaSlug, date, matchId, embedded = false }: PublicBookingContentProps) {
  const content = await PublicBookingView({ arenaSlug, date, matchId, embedded });
  const loadDate = loadPublicBookingDate.bind(null, arenaSlug, matchId, embedded);
  return embedded ? <section className={cx(viewStyles.athlete_portal_booking, "tw:mx-0! tw:mt-0! tw:w-full! tw:pb-0!")}><BookingDateTransition loadDate={loadDate}>{content}</BookingDateTransition></section> : <PortalTheme className="tw:[--panel:#fff] tw:[--text:#111827] tw:[--muted:#111827] tw:[--line:#d8e5e9] tw:[--portal-ink:#111827] tw:[--portal-soft:#fff] tw:[--portal-line:#d8e5e9] tw:dark:[--panel:#101c2d] tw:dark:[--text:#eff3f8] tw:dark:[--muted:#bdd9e6] tw:dark:[--line:#293648] tw:dark:[--portal-ink:#eff3f8] tw:dark:[--portal-soft:#101c2d] tw:dark:[--portal-line:#293648] tw:[color-scheme:light] tw:dark:[color-scheme:dark] tw:min-h-screen tw:bg-white tw:text-black tw:dark:bg-[#071421] tw:dark:text-[#eff3f8]"><main className="tw:p-5 tw:viewport-700:p-1"><BookingDateTransition loadDate={loadDate}>{content}</BookingDateTransition></main></PortalTheme>;
}
