import { loadPortalEventPanelAction } from "@/lib/actions/portal-events";
import { PortalTournamentTabs } from "@/components/portal/tournament-tabs";
import { PortalTheme } from "@/components/portal/portal-theme";
import { PortalThemeToggle } from "@/components/portal/portal-theme-controls";
import { AnnouncementsFeed } from "@/components/portal/announcements-feed";
import { PortalLocalTabs } from "@/components/portal/local-tabs";
import { ArenaLegalLinks } from "@/components/legal/arena-legal-links";
import { PortalAmbientBackground } from "@/components/portal/portal-ambient-background";
import { arenaBookingPath } from "@/lib/arena-booking-path";
import { AthletePortalWordmark } from "@/components/athlete-portal-wordmark";
import { PortalHome } from "@/components/portal/portal-home";
import { PortalSidebar, PortalBottomNav } from "@/components/portal/portal-navigation";
import { portalMenu } from "@/lib/portal/menu";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./public-standings.utilities";
import Link from "next/link";
import { PublicBookingContent } from "@/components/public-booking-content";
import type { ArenaPublicStandings, PublicArenaShell } from "@/lib/services/public-standings";
import { PublicPlayerProfile } from "@/components/public-player-profile";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { PlayerAvatar } from "@/components/player-avatar";
import { PortalRichText } from "@/components/portal-rich-text";
import { PublicDoublesRadar } from "@/components/public-doubles-radar";
import { PublicSuper12 } from "@/components/public-super12";
import { AthletePortalNotifications } from "@/components/athlete-portal-notifications";
import { AthletePortalPrefetch } from "@/components/athlete-portal-prefetch";
import { AthletePortalLoginLayout } from "@/components/athlete-portal-login-layout";
import { logoutAthletePortalAction } from "@/lib/actions/player-auth";
import { PublicEventRadar } from "@/components/public-event-radar";
import { PublicFinanceEntryList } from "@/components/public-finance-entry-list";
import { TeacherPortalStudentList } from "@/components/teacher-portal-student-list";
import { TeacherPortalMakeupPlanner } from "@/components/teacher-portal-makeup-planner";
import { PortalClientComandas } from "@/components/portal-client-comandas";
import { mobileFinanceAttention } from "@/lib/finance/mobile-finance-attention";
import {
  portalQuery,
  type EventTab,
  type LeagueTab,
  type PortalSection,
} from "@/lib/portal/navigation";
import {
  checkInPortalLessonAction,
  requestPortalLessonMakeupAction,
  requestClassGroupAction,
  updateTeacherPortalClassGroupCapacityAction,
} from "@/lib/actions/class-groups";

type Portal = Awaited<
  ReturnType<
    typeof import("@/lib/services/public-league-portal").getPublicLeaguePortal
  >
>;
type ClientHome = Awaited<ReturnType<typeof import("@/lib/services/public-client-home").getPublicClientHome>>;
type ClientFinance = Awaited<ReturnType<typeof import("@/lib/services/public-client-home").getPublicClientFinance>>;
type AthleteNotifications = Awaited<ReturnType<typeof import("@/lib/services/public-player-notifications").getAthletePortalNotifications>>;

const mobilePortalSkin = [
  "tw:viewport-700:[&_.athlete-portal-content-panel]:border-[#d8e5e9]!",
  "tw:viewport-700:[&_.athlete-portal-content-panel]:bg-white!",
  "tw:viewport-700:[&_.athlete-portal-content-panel]:[background-image:none]!",
  "tw:viewport-700:[&_.athlete-portal-content-panel]:text-[#133047]!",
  "tw:viewport-700:[&_.athlete-portal-content-panel]:shadow-none!",
  "tw:viewport-700:dark:[&_.athlete-portal-content-panel]:border-[#416393]!",
  "tw:viewport-700:dark:[&_.athlete-portal-content-panel]:bg-[#101c2d]!",
  "tw:viewport-700:dark:[&_.athlete-portal-content-panel]:[background-image:none]!",
  "tw:viewport-700:dark:[&_.athlete-portal-content-panel]:text-[#eaf3ff]!",
  "tw:viewport-700:[&_.athlete-portal-content-panel_>_header_>_span]:hidden!",
  "tw:viewport-700:[&_.athlete-portal-content-panel_>_header_h2]:text-[#133047]!",
  "tw:viewport-700:dark:[&_.athlete-portal-content-panel_>_header_h2]:text-[#eaf3ff]!",
  "tw:viewport-700:[&_.athlete-portal-content-panel_>_header_p]:text-[#606874]!",
  "tw:viewport-700:dark:[&_.athlete-portal-content-panel_>_header_p]:text-[#a4b3c8]!",
  "tw:viewport-700:[&_.portal-empty]:border-[#d8e5e9]!",
  "tw:viewport-700:[&_.portal-empty]:bg-white!",
  "tw:viewport-700:[&_.portal-empty_strong]:text-[#133047]!",
  "tw:viewport-700:[&_.portal-empty_span]:text-[#606874]!",
  "tw:viewport-700:dark:[&_.portal-empty]:border-[#2a4161]!",
  "tw:viewport-700:dark:[&_.portal-empty]:bg-[#102441]!",
  "tw:viewport-700:dark:[&_.portal-empty_strong]:text-[#eaf3ff]!",
  "tw:viewport-700:dark:[&_.portal-empty_span]:text-[#a4b3c8]!",
  "tw:viewport-700:[&_.portal-announcements-feed_article]:border-[#d8e5e9]!",
  "tw:viewport-700:[&_.portal-announcements-feed_article]:bg-white!",
  "tw:viewport-700:[&_.portal-announcements-feed_article_strong]:text-[#133047]!",
  "tw:viewport-700:[&_.portal-announcements-feed_article_p]:text-[#606874]!",
  "tw:viewport-700:dark:[&_.portal-announcements-feed_article]:border-[#2a4161]!",
  "tw:viewport-700:dark:[&_.portal-announcements-feed_article]:bg-[#102441]!",
  "tw:viewport-700:dark:[&_.portal-announcements-feed_article_strong]:text-[#eaf3ff]!",
  "tw:viewport-700:dark:[&_.portal-announcements-feed_article_p]:text-[#a4b3c8]!",
  "tw:[&_.portal-announcements-feed_>_p.muted]:text-[var(--portal-muted)]!",
  "tw:viewport-700:[&_.portal-announcements-feed_>_p.muted]:text-[#606874]!",
  "tw:viewport-700:dark:[&_.portal-announcements-feed_>_p.muted]:text-[#a4b3c8]!",
  "tw:viewport-700:[&_.portal-activity-list_article]:border-[#d8e5e9]!",
  "tw:viewport-700:[&_.portal-activity-list_article]:bg-white!",
  "tw:viewport-700:dark:[&_.portal-activity-list_article]:border-[#2a4161]!",
  "tw:viewport-700:dark:[&_.portal-activity-list_article]:bg-[#102441]!",
  "tw:viewport-700:dark:[&_.portal-activity-list_article_strong]:text-[#eaf3ff]!",
  "tw:viewport-700:dark:[&_.portal-activity-list_article_span]:text-[#a4b3c8]!",
  "tw:viewport-700:dark:[&_.portal-activity-list_article_b]:text-[#5e96e5]!",
  "tw:viewport-700:[&_.super12-empty]:text-[#606874]!",
  "tw:viewport-700:[&_.super12-empty_strong]:text-[#133047]!",
  "tw:viewport-700:dark:[&_.super12-empty]:text-[#a4b3c8]!",
  "tw:viewport-700:dark:[&_.super12-empty_strong]:text-[#eaf3ff]!",
  "tw:[&_.avatar-crop-field_>_small]:text-[var(--portal-muted)]!",
  "tw:viewport-700:[&_.avatar-crop-field_>_small]:text-[#606874]!",
  "tw:viewport-700:dark:[&_.avatar-crop-field_>_small]:text-[#a4b3c8]!",
  "tw:viewport-700:[&_.portal-learning-empty_>_b]:hidden!",
  "tw:viewport-700:[&_.portal-learning-empty]:bg-white!",
  "tw:viewport-700:dark:[&_.portal-learning-empty]:bg-[#102441]!",
  "tw:viewport-700:[&_.portal-comanda-empty]:border-[#d8e5e9]!",
  "tw:viewport-700:[&_.portal-comanda-empty]:bg-white!",
  "tw:viewport-700:[&_.portal-comanda-empty_strong]:text-[#133047]!",
  "tw:viewport-700:[&_.portal-comanda-empty_p]:text-[#606874]!",
  "tw:viewport-700:dark:[&_.portal-comanda-empty]:border-[#2a4161]!",
  "tw:viewport-700:dark:[&_.portal-comanda-empty]:bg-[#102441]!",
  "tw:viewport-700:dark:[&_.portal-comanda-empty_strong]:text-[#eaf3ff]!",
  "tw:viewport-700:dark:[&_.portal-comanda-empty_p]:text-[#a4b3c8]!",
  "tw:viewport-700:[&_.public-player-profile_label]:text-[#133047]!",
  "tw:viewport-700:dark:[&_.public-player-profile_label]:text-[#eaf3ff]!",
  "tw:viewport-700:[&_.public-player-profile_input:not([type=radio])]:border-[#c9dbe2]!",
  "tw:viewport-700:[&_.public-player-profile_input:not([type=radio])]:bg-white!",
  "tw:viewport-700:[&_.public-player-profile_input:not([type=radio])]:text-[#133047]!",
  "tw:viewport-700:dark:[&_.public-player-profile_input:not([type=radio])]:border-[#3b5271]!",
  "tw:viewport-700:dark:[&_.public-player-profile_input:not([type=radio])]:bg-[#102441]!",
  "tw:viewport-700:dark:[&_.public-player-profile_input:not([type=radio])]:text-[#eaf3ff]!",
  "tw:viewport-700:[&_.public-player-profile_textarea]:border-[#c9dbe2]!",
  "tw:viewport-700:[&_.public-player-profile_textarea]:bg-white!",
  "tw:viewport-700:[&_.public-player-profile_textarea]:text-[#133047]!",
  "tw:viewport-700:dark:[&_.public-player-profile_textarea]:border-[#3b5271]!",
  "tw:viewport-700:dark:[&_.public-player-profile_textarea]:bg-[#102441]!",
  "tw:viewport-700:dark:[&_.public-player-profile_textarea]:text-[#eaf3ff]!",
  "tw:viewport-700:[&_.public-player-profile_textarea::placeholder]:text-[#606874]!",
  "tw:viewport-700:dark:[&_.public-player-profile_textarea::placeholder]:text-[#a4b3c8]!",
  "tw:viewport-700:[&_.public-player-profile_select]:border-[#c9dbe2]!",
  "tw:viewport-700:[&_.public-player-profile_select]:bg-white!",
  "tw:viewport-700:[&_.public-player-profile_select]:text-[#133047]!",
  "tw:viewport-700:dark:[&_.public-player-profile_select]:border-[#3b5271]!",
  "tw:viewport-700:dark:[&_.public-player-profile_select]:bg-[#102441]!",
  "tw:viewport-700:dark:[&_.public-player-profile_select]:text-[#eaf3ff]!",
  "tw:viewport-700:[&_.avatar-crop-preview]:size-28!",
  "tw:viewport-700:[&_.public-player-padel-profile]:border-[#d8e5e9]!",
  "tw:viewport-700:[&_.public-player-padel-profile]:bg-white!",
  "tw:viewport-700:[&_.public-player-padel-profile]:[background-image:none]!",
  "tw:viewport-700:[&_.public-player-padel-profile_legend]:text-[#133047]!",
  "tw:viewport-700:[&_.public-player-padel-profile_p]:text-[#606874]!",
  "tw:viewport-700:dark:[&_.public-player-padel-profile]:border-[#3b5271]!",
  "tw:viewport-700:dark:[&_.public-player-padel-profile]:bg-[#102441]!",
  "tw:viewport-700:dark:[&_.public-player-padel-profile_legend]:text-[#eaf3ff]!",
  "tw:viewport-700:dark:[&_.public-player-padel-profile_p]:text-[#a4b3c8]!",
  "tw:viewport-700:[&_.public-player-padel-categories_label]:border-[#d8e5e9]!",
  "tw:viewport-700:[&_.public-player-padel-categories_label]:bg-white!",
  "tw:viewport-700:[&_.public-player-padel-categories_label]:text-[#133047]!",
  "tw:viewport-700:dark:[&_.public-player-padel-categories_label]:border-[#3b5271]!",
  "tw:viewport-700:dark:[&_.public-player-padel-categories_label]:bg-[#0b1a30]!",
  "tw:viewport-700:dark:[&_.public-player-padel-categories_label]:text-[#eaf3ff]!",
  "tw:viewport-700:[&_.public-player-profile_button[type=submit]]:bg-[#08387b]!",
  "tw:viewport-700:dark:[&_.public-player-profile_button[type=submit]]:bg-[#5b92de]! tw:viewport-700:dark:[&_.public-player-profile_button[type=submit]]:text-[#082b34]!",
  "tw:viewport-700:[&_.portal-teacher-picker_strong]:text-[#133047]!",
  "tw:viewport-700:[&_.portal-teacher-picker_>_span]:text-[#606874]!",
  "tw:viewport-700:[&_.portal-teacher-hint]:border-[#d8e5e9]!",
  "tw:viewport-700:[&_.portal-teacher-hint]:bg-white!",
  "tw:viewport-700:[&_.portal-teacher-hint]:text-[#606874]!",
  "tw:viewport-700:dark:[&_.portal-teacher-picker_strong]:text-[#eaf3ff]!",
  "tw:viewport-700:dark:[&_.portal-teacher-picker_>_span]:text-[#a4b3c8]!",
  "tw:viewport-700:dark:[&_.portal-teacher-hint]:border-[#2a4161]!",
  "tw:viewport-700:dark:[&_.portal-teacher-hint]:bg-[#102441]!",
  "tw:viewport-700:dark:[&_.portal-teacher-hint]:text-[#a4b3c8]!",
  "tw:viewport-700:[&_.avatar-crop-controls_label.button]:border-[#c9dbe2]!",
  "tw:viewport-700:[&_.avatar-crop-controls_label.button]:bg-white!",
  "tw:viewport-700:[&_.avatar-crop-controls_label.button]:text-[#133047]!",
  "tw:viewport-700:dark:[&_.avatar-crop-controls_label.button]:border-[#3b5271]!",
  "tw:viewport-700:dark:[&_.avatar-crop-controls_label.button]:bg-[#102441]!",
  "tw:viewport-700:dark:[&_.avatar-crop-controls_label.button]:text-[#eaf3ff]!",
  "tw:viewport-700:[&_.portal-rule]:border-[#d8e5e9]!",
  "tw:viewport-700:[&_.portal-rule]:bg-white!",
  "tw:viewport-700:[&_.portal-rule_strong]:text-[#133047]!",
  "tw:viewport-700:[&_.portal-rule_p]:text-[#606874]!",
  "tw:viewport-700:dark:[&_.portal-rule]:border-[#2a4161]!",
  "tw:viewport-700:dark:[&_.portal-rule]:bg-[#102441]!",
  "tw:viewport-700:dark:[&_.portal-rule_strong]:text-[#eaf3ff]!",
  "tw:viewport-700:dark:[&_.portal-rule_p]:text-[#a4b3c8]!",
].join(" ");
const mobilePortalTabs = "tw:mx-4 tw:mt-3 tw:flex tw:flex-wrap tw:gap-1 tw:border-b tw:border-[#d8e5e9] tw:pb-1 tw:dark:border-[#2a4161] tw:[&_a]:shrink-0 tw:[&_a]:rounded-md tw:[&_a]:border tw:[&_a]:border-transparent tw:[&_a]:px-3 tw:[&_a]:py-3 tw:[&_a]:text-xs tw:[&_a]:font-medium tw:[&_a]:text-[#606874] tw:[&_a]:no-underline tw:dark:[&_a]:text-[#a4b3c8] tw:[&_a.active]:border-[#174983] tw:[&_a.active]:bg-[#174983] tw:[&_a.active]:text-white tw:dark:[&_a.active]:text-white";

export function PublicStandings({
  data,
  arena,
  currentClient,
  athleteArenas,
  portal,
  home,
  finance,
  comandas,
  radar,
  radarGender,
  radarCategory,
  super12,
  notifications,
  eventTab = "leagues",
  eventRadarView = "region",
  super12Id,
  financeTab = "upcoming",
  authForm,
  section = "leagues",
  directBooking = false,
  leagueTab = "games",
  leagueCategoryId,
  bookingDate,
  bookingMatchId,
  weekday,
}: {
  data: ArenaPublicStandings | null;
  arena: PublicArenaShell;
  currentClient: {
    name: string;
    phone: string;
    email: string;
    photoUrl: string;
    bio: string;
    birthDate: string;
    padelCategories: string[];
    padelSide: string;
    gender: string;
    tournamentAvailability: string;
    isTeacher: boolean;
  } | null;
  athleteArenas: { slug: string; name: string; logoUrl: string; playerName: string }[];
  portal: Portal;
  home: ClientHome;
  finance: ClientFinance;
  comandas: Awaited<ReturnType<typeof import("@/lib/services/public-client-home").getPublicClientComandas>>;
  radar: Awaited<ReturnType<typeof import("@/lib/services/public-doubles-radar").getPublicDoublesRadar>>;
  radarGender?: string;
  radarCategory?: string;
  super12: Awaited<ReturnType<typeof import("@/lib/services/public-super12").getPublicSuper12>>;
  notifications: AthleteNotifications;
  eventTab?: EventTab;
  eventRadarView?: "region" | "all";
  super12Id?: string;
  financeTab?: "upcoming" | "history";
  authForm: React.ReactNode;
  section?: PortalSection;
  directBooking?: boolean;
  leagueTab?: LeagueTab;
  leagueCategoryId?: string;
  bookingDate?: string;
  bookingMatchId?: string;
  weekday?: string;
}) {
  const portalHref = (
    section: PortalSection,
    leagueTab?: LeagueTab,
    teacherId?: string,
    leagueCategoryId?: string,
    eventTab?: EventTab,
    super12Id?: string,
  ) => `/home?arena=${encodeURIComponent(arena.slug)}&${portalQuery(section, leagueTab, teacherId, leagueCategoryId, eventTab, super12Id).slice(1)}`;
  if (!currentClient)
    return <AthletePortalLoginLayout arena={{ name: arena.name, logoUrl: arena.athletePortalLogoUrl || arena.logoUrl }}>{authForm}</AthletePortalLoginLayout>;

  const portalVisibility = arena;
  const requestedSection: string =
    section === "leagues" && !portalVisibility.athletePortalShowLeagues
      ? "profile"
      : (section === "booking" || section === "schedule") && !directBooking && !portalVisibility.athletePortalShowBooking
        ? "profile"
        : section === "reservations" &&
            !portalVisibility.athletePortalShowReservations
          ? "profile"
          : section === "lessons" && !portalVisibility.athletePortalShowLessons
            ? "profile"
            : section === "classes" &&
                !portalVisibility.athletePortalShowClasses
              ? "profile"
              : section === "radar" &&
                  !portalVisibility.athletePortalShowDoublesRadar
                ? "profile"
              : section === "schedule" ? "booking" : section;
  const selectedLeagueTab: LeagueTab =
    leagueTab === "pairs" ||
    leagueTab === "ranking" ||
    leagueTab === "rules" ||
    leagueTab === "prizes"
      ? leagueTab
      : "games";
  const selectedEventTab: EventTab = eventTab === "super12" || eventTab === "radar" ? eventTab : "leagues";
  const menuItems = portalMenu(portalVisibility, currentClient.isTeacher);
  const sectionTitle = requestedSection === "booking"
    ? "Reservas"
    : menuItems.find(item => item.section === requestedSection)?.label ?? "Portal do atleta";

  // Panel consumers expect an image token; equal color stops keep their fill opaque and solid.
  return (
    <PortalTheme className="portal-app tw:[color-scheme:light] tw:dark:[color-scheme:dark] tw:[&_button[type=submit]:not([data-portal-neutral])]:bg-[#087443]! tw:[&_button[type=submit]:not([data-portal-neutral])]:text-white! tw:[&_[data-portal-action]]:bg-[#087443]! tw:[&_[data-portal-action]]:text-white! tw:relative tw:isolate tw:[--panel:#fff] tw:[--text:#202c3c] tw:[--muted:#606874] tw:[--line:#e1e4e9] tw:[--line-strong:#91a6c4] tw:[--brand:#1e5ea8] tw:[--brand-strong:#174983] tw:dark:[--panel:#101c2d] tw:dark:[--text:#e9edf3] tw:dark:[--muted:#aab4c2] tw:dark:[--line:#293648] tw:[--portal-ink:#202c3c] tw:[--portal-muted:#606874] tw:[--portal-accent:#174983] tw:[--portal-surface:#fff] tw:[--portal-soft:#fff] tw:[--portal-line:#e1e4e9] tw:[--portal-selection-surface:#174983] tw:[--portal-selection-ink:#fff] tw:dark:[--portal-selection-surface:#174983] tw:dark:[--portal-selection-ink:#fff] tw:[--portal-warning-ink:#b64733] tw:[--portal-warning-surface:#fff3ed] tw:[--portal-panel-image:linear-gradient(#fff,#fff)] tw:[--portal-shadow:0_3px_16px_rgba(21,37,60,.04)] tw:dark:[--portal-ink:#e9edf3] tw:dark:[--portal-muted:#aab4c2] tw:dark:[--portal-accent:#a5bcdc] tw:dark:[--portal-surface:#101c2d] tw:dark:[--portal-soft:#213148] tw:dark:[--portal-line:#293648] tw:dark:[--portal-warning-ink:#ffb49a] tw:dark:[--portal-warning-surface:#422d24] tw:dark:[--portal-panel-image:linear-gradient(#101c2d,#101c2d)] tw:[&_*]:box-border tw:flex tw:min-h-dvh tw:min-w-0 tw:bg-white tw:text-[#202c3c] tw:dark:bg-[#091525] tw:dark:text-[#e9edf3]">
      <PortalAmbientBackground />
      <PortalSidebar items={menuItems} current={requestedSection === "booking" ? "schedule" : requestedSection} href={portalHref} arenaName={arena.name} logoUrl={arena.athletePortalLogoUrl || arena.logoUrl} />
      <main className={cx("athlete-portal-page tw:min-w-0 tw:flex-1 tw:pb-24 tw:min-[1100px]:pb-10", mobilePortalSkin)}>
      <header className="tw:flex tw:min-h-[76px] tw:items-center tw:justify-between tw:gap-3 tw:border-b tw:border-[#e1e4e9] tw:bg-white tw:px-4 tw:py-3 tw:dark:border-[#293648] tw:dark:bg-[#101c2d]/80 tw:min-[700px]:px-8" aria-label="Cabeçalho do portal">
        <div className="tw:flex tw:min-w-0 tw:items-center tw:gap-3">{requestedSection !== "home" ? <Link href={portalHref("home")} aria-label="Voltar ao início" className="tw:grid tw:size-10 tw:shrink-0 tw:place-items-center tw:rounded-xl tw:border tw:border-[#e1e4e9] tw:text-inherit tw:no-underline tw:dark:border-[#293648]">←</Link> : null}<div className="tw:min-w-0"><AthletePortalWordmark compact/><Link href="/portal" aria-label="Trocar de arena" title={arena.name} className="tw:mt-1 tw:block tw:break-words tw:text-sm tw:font-semibold tw:text-inherit tw:no-underline tw:min-[1100px]:hidden">{arena.name}</Link></div></div>
        <div className="tw:flex tw:shrink-0 tw:items-center tw:gap-2"><PortalThemeToggle /><AthletePortalNotifications arenaSlug={arena.slug} notifications={notifications}/><Link href={portalHref("profile")} aria-label="Meu perfil" className="tw:grid tw:size-10 tw:place-items-center tw:rounded-full tw:border-2 tw:border-white tw:bg-white tw:text-sm tw:font-bold tw:text-[#324a6b] tw:no-underline tw:shadow-sm tw:dark:border-[#293648] tw:dark:bg-[#29384d] tw:dark:text-[#b6c7df]"><PlayerAvatar photoUrl={currentClient.photoUrl} name={currentClient.name} className="athlete-portal-user-avatar tw:grid tw:size-9! tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-full! tw:text-xs! tw:[&_img]:size-full tw:[&_img]:object-cover" /></Link><form action={logoutAthletePortalAction} className="tw:hidden tw:min-[700px]:block"><input type="hidden" name="arenaSlug" value={arena.slug}/><button className="tw:min-h-10 tw:cursor-pointer tw:rounded-xl tw:border-0 tw:bg-transparent tw:px-3 tw:text-xs tw:font-medium tw:text-[#606874] tw:hover:bg-white tw:dark:text-[#adb7c6]" type="submit" data-portal-neutral>Sair</button></form></div>
      </header>
      <div className="portal-workspace tw:mx-auto tw:grid tw:w-full tw:max-w-[1240px] tw:min-w-0 tw:gap-5 tw:px-4 tw:py-6 tw:min-[700px]:px-8 tw:min-[700px]:py-8">
      <div className="tw:flex tw:justify-end"><Link href="/portal" className="tw:inline-flex tw:min-h-10 tw:items-center tw:gap-3 tw:rounded-xl tw:border tw:border-[#91a3bc] tw:bg-white tw:px-4 tw:text-xs tw:font-bold tw:text-[#173054] tw:no-underline tw:shadow-sm tw:dark:border-[#657b9a] tw:dark:bg-[#24354e] tw:dark:text-[#d9e9ff]">Trocar de arena <span aria-hidden="true">⇄</span></Link></div>
      {requestedSection !== "home" ? <div><p className="tw:mb-1 tw:text-[10px] tw:font-semibold tw:tracking-[.12em] tw:text-[#606874] tw:dark:text-[#aab4c2]">SEU PORTAL</p><h1 className="tw:m-0 tw:text-2xl tw:font-semibold tw:tracking-tight">{sectionTitle}</h1></div> : null}
      <AthletePortalPrefetch hrefs={[portalHref("home"), portalHref("announcements"), portalHref("leagues", "games"), portalHref("lessons"), portalHref("profile"), portalHref("radar"), portalHref("comandas")]} />
      {requestedSection === "lessons" || requestedSection === "classes" ? (
        <nav
          className={cx(viewStyles.athlete_portal_league_nav_athlete_portal_learning_tabs, "tw:viewport-700:hidden!")}
          aria-label="Menu de aulas"
        >
          {portalVisibility.athletePortalShowLessons ? (
            <Link
              aria-current={requestedSection === "lessons" ? "page" : undefined} className={cx(requestedSection === "lessons" ? "active" : "")}
              href={portalHref("lessons")}
            >
              <EventNavIcon icon="calendar" /><span>Minhas aulas</span>
            </Link>
          ) : null}
          {portalVisibility.athletePortalShowClasses ? (
            <Link
              aria-current={requestedSection === "classes" ? "page" : undefined} className={cx(requestedSection === "classes" ? "active" : "")}
              href={portalHref("classes")}
            >
              <EventNavIcon icon="players" /><span>Turmas</span>
            </Link>
          ) : null}
        </nav>
      ) : null}
      {requestedSection === "lessons" || requestedSection === "classes" ? <nav className={cx("tw:hidden! tw:viewport-700:flex!", mobilePortalTabs)} aria-label="Menu de aulas">{portalVisibility.athletePortalShowLessons ? <Link aria-current={requestedSection === "lessons" ? "page" : undefined} className={cx(requestedSection === "lessons" ? "active" : "")} href={portalHref("lessons")}>Minhas aulas</Link> : null}{portalVisibility.athletePortalShowClasses ? <Link aria-current={requestedSection === "classes" ? "page" : undefined} className={cx(requestedSection === "classes" ? "active" : "")} href={portalHref("classes")}>Turmas</Link> : null}</nav> : null}
      {requestedSection === "profile" || requestedSection === "comandas" ? (
        <nav className={cx(viewStyles.athlete_portal_league_nav, "tw:viewport-700:hidden!")} aria-label="Menu do meu perfil">
          <Link aria-current={requestedSection === "profile" ? "page" : undefined} className={cx(requestedSection === "profile" ? "active" : "")} href={portalHref("profile")}>Dados pessoais</Link>
          <Link href={portalHref("finance")}>Finanças</Link>
          <Link aria-current={requestedSection === "comandas" ? "page" : undefined} className={cx(requestedSection === "comandas" ? "active" : "")} href={portalHref("comandas")}>Minhas comandas</Link>
        </nav>
      ) : null}
      {requestedSection === "profile" || requestedSection === "comandas" ? <nav className={cx("tw:hidden! tw:viewport-700:flex!", mobilePortalTabs)} aria-label="Menu do meu perfil"><Link aria-current={requestedSection === "profile" ? "page" : undefined} className={cx(requestedSection === "profile" ? "active" : "")} href={portalHref("profile")}>Dados pessoais</Link><Link href={portalHref("finance")}>Finanças</Link><Link aria-current={requestedSection === "comandas" ? "page" : undefined} className={cx(requestedSection === "comandas" ? "active" : "")} href={portalHref("comandas")}>Comandas</Link></nav> : null}
      {requestedSection === "home" ? (
        <PortalHome home={home} name={currentClient.name} items={menuItems} href={portalHref} bookingHref={arenaBookingPath(arena.slug)} />
      ) : requestedSection === "announcements" ? (
        <AnnouncementsFeed key={arena.slug} arenaSlug={arena.slug} />
      ) : requestedSection === "finance" ? (
        <ClientFinancePanel finance={finance} comandas={comandas} arenaSlug={arena.slug} tab={financeTab} />
      ) : requestedSection === "comandas" ? (
        <PortalClientComandas data={comandas} arenaSlug={arena.slug} />
      ) : requestedSection === "radar" ? (
        <PublicDoublesRadar
          arenaSlug={arena.slug}
          radar={radar}
          currentAvailability={currentClient.tournamentAvailability === "AVAILABLE" || currentClient.tournamentAvailability === "LOOKING_FOR_PARTNER" ? currentClient.tournamentAvailability : "OFF"}
          selectedGender={radarGender}
          selectedCategory={radarCategory}
        />
      ) : requestedSection === "leagues" ? (
        <section className="tw:min-w-0">
          <PortalLocalTabs key={`${arena.slug}:${selectedEventTab}`} label="Menu de Eventos" hashTabs={{ "jogo-": "leagues", "desafio-": "leagues" }} initial={selectedEventTab} tabs={[
            { id: "leagues", label: "Torneios", ...(selectedEventTab === "leagues" ? { content: <PortalTournamentTabs arenaSlug={arena.slug} playerName={currentClient.name} portal={portal} data={data} initial={selectedLeagueTab} /> } : { load: loadPortalEventPanelAction.bind(null, arena.slug, "leagues", leagueCategoryId, super12Id) }) },
            { id: "super12", label: "Super 12", ...(selectedEventTab === "super12" ? { content: <PublicSuper12 arenaSlug={arena.slug} data={super12} /> } : { load: loadPortalEventPanelAction.bind(null, arena.slug, "super12", leagueCategoryId, super12Id) }) },
            { id: "radar", label: "Radar de torneios", ...(selectedEventTab === "radar" ? { content: <PublicEventRadar embedded view={eventRadarView} /> } : { load: loadPortalEventPanelAction.bind(null, arena.slug, "radar", leagueCategoryId, super12Id) }) },
          ]} />
        </section>
      ) : requestedSection === "schedule" || requestedSection === "booking" ? (
        <PublicBookingContent
          arenaSlug={arena.slug}
          date={bookingDate}
          matchId={bookingMatchId}
          embedded
        />
      ) : requestedSection === "reservations" ? (
        <ReservationsPanel portal={portal} />
      ) : requestedSection === "lessons" ? (
        <LessonsPanel portal={portal} />
      ) : requestedSection === "classes" ? (
        <ClassesPanel portal={portal} weekday={weekday} arenaSlug={arena.slug} />
      ) : requestedSection === "teacher" && currentClient.isTeacher ? (
        <TeacherManagementPanel portal={portal} />
      ) : (
        <PublicPlayerProfile arenaSlug={arena.slug} player={currentClient} />
      )}
      {requestedSection === "profile" ? <form action={logoutAthletePortalAction} className="tw:min-[700px]:hidden"><input type="hidden" name="arenaSlug" value={arena.slug}/><button type="submit" className="tw:min-h-11 tw:w-full tw:cursor-pointer tw:rounded-xl tw:border tw:border-[#dce1e7] tw:bg-white tw:px-4 tw:text-sm tw:font-medium tw:text-[#606874] tw:dark:border-[#293648] tw:dark:bg-[#101c2d] tw:dark:text-[#adb7c6]">Sair da conta</button></form> : null}
      </div>
      <PortalBottomNav items={menuItems} current={requestedSection === "booking" ? "schedule" : requestedSection} href={portalHref} />
    <footer className="tw:mx-auto tw:w-full tw:max-w-[1240px] tw:px-4 tw:py-5 tw:text-xs tw:text-[var(--portal-muted)] tw:min-[700px]:px-8"><ArenaLegalLinks arenaSlug={arena.slug}/></footer>
      </main></PortalTheme>
  );
}

function ClientFinancePanel({ finance, comandas, arenaSlug, tab }: { finance: ClientFinance; comandas: Awaited<ReturnType<typeof import("@/lib/services/public-client-home").getPublicClientComandas>>; arenaSlug: string; tab: "upcoming" | "history" }) {
  if (!finance) return <section className={viewStyles.athlete_portal_content_panel}><PortalEmpty title="Finanças indisponíveis" detail="Não foi possível carregar suas informações financeiras agora." /></section>;
  if (finance.disabled) return <section className={viewStyles.athlete_portal_content_panel}><PortalEmpty title="Consulta financeira desativada" detail="A arena desativou a consulta de faturas e consumos no Portal. Para informações, procure a recepção." /></section>;
  const pendingCount = finance.overdue.length + finance.open.length + finance.comandas.length;
  const mobileAttention = mobileFinanceAttention({ overdueCount: finance.overdue.length, hasSoonPayment: finance.open.some((entry) => entry.urgency === "soon"), openComandaCount: finance.comandas.length });
  return <section className={cx(viewStyles.client_finance_page, "tw:viewport-700:gap-3! tw:viewport-700:pb-24!")}>
    <div className="tw:hidden tw:viewport-700:block"><div className="tw:grid tw:grid-cols-2 tw:gap-2"><div className="tw:rounded-2xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-3 tw:dark:border-[#3e5e8b] tw:dark:bg-[#10294c]"><small className="tw:block tw:text-[#606874] tw:dark:text-[#a4b3c8]">Itens em aberto</small><strong className="tw:mt-1 tw:block tw:text-xl">{pendingCount}</strong></div><div className="tw:rounded-2xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-3 tw:dark:border-[#3e5e8b] tw:dark:bg-[#10294c]"><small className="tw:block tw:text-[#606874] tw:dark:text-[#a4b3c8]">Próximos 15 dias</small><strong className="tw:mt-1 tw:block tw:text-xl">{finance.open.length}</strong></div></div><p className={cx("tw:mt-3 tw:text-xs tw:font-medium", mobileAttention.kind === "overdue" ? "tw:text-[#b42318] tw:dark:text-[#ff9e8f]" : mobileAttention.kind === "soon" ? "tw:text-[#a86100] tw:dark:text-[#ffd18a]" : "tw:text-[#08387b] tw:dark:text-[#5b92de]")}>{mobileAttention.message}</p></div>
    <header className={cx(`${viewStyles.client_finance_hero} is-${finance.health}`, "tw:viewport-700:hidden!")}>
      <span>FINANÇAS</span>
      <div><div className={viewStyles.client_finance_orb} aria-hidden="true"><FinanceIcon icon="wallet" /></div><div><h2>{finance.headline}</h2><p>{finance.detail}</p></div></div>
      <b className={viewStyles.client_finance_motto}>DISCIPLINA<br />TAMBÉM<br />JOGA.</b>
    </header>
    <div className={cx(viewStyles.client_finance_summary, "tw:viewport-700:hidden!")} aria-label="Resumo financeiro">
      <article className={cx(pendingCount ? viewStyles.is_attention : "is-healthy")}><span><FinanceIcon icon={pendingCount ? "receipt" : "check"} /></span><div><b>{pendingCount ? "Em aberto" : "Em dia"}</b><small>{pendingCount ? `${pendingCount} ${pendingCount === 1 ? "item" : "itens"} para acompanhar` : "Suas finanças organizadas"}</small></div></article>
      <article><span><FinanceIcon icon="receipt" /></span><div><b>Em aberto</b><strong>{pendingCount}</strong></div></article>
      <article><span><FinanceIcon icon="calendar" /></span><div><b>Próximos</b><strong>{finance.open.length}</strong></div></article>
    </div>
    <PortalLocalTabs key={arenaSlug} label="Navegação financeira" initial={tab} tabs={[
      { id: "upcoming", label: "Lançamentos", href: `/home?arena=${encodeURIComponent(arenaSlug)}&section=finance`, content: <PublicFinanceEntryList paymentEnabled={finance.paymentEnabled} arenaSlug={arenaSlug} overdue={finance.overdue} open={finance.open} comandas={finance.comandas} /> },
      { id: "history", label: "Histórico", href: `/home?arena=${encodeURIComponent(arenaSlug)}&section=finance&financeTab=history`, content: <><section className={cx(viewStyles.client_finance_section, "tw:viewport-700:hidden!")}><header><div><span className={viewStyles.client_finance_section_icon}><FinanceIcon icon="receipt" /></span><h3>Histórico de pagamentos</h3></div><span>{finance.paid.length}</span></header>{finance.paid.length ? finance.paid.map((entry) => <article className={viewStyles.client_finance_entry} key={entry.id}><div><strong>{entry.description}</strong><small>Pago em {entry.paidAt || entry.dueDate}</small></div><b>{entry.amount}</b><em>Pago</em></article>) : <p className={viewStyles.client_finance_empty}>Quando houver pagamentos, eles aparecerão aqui.</p>}</section><section className="tw:hidden tw:rounded-2xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-4 tw:viewport-700:block tw:dark:border-[#3e5e8b] tw:dark:bg-[#10294c]"><header className="tw:mb-3 tw:flex tw:items-center tw:justify-between"><h3 className="tw:m-0 tw:text-base tw:font-semibold">Pagamentos realizados</h3><span className="tw:text-xs tw:text-[#606874] tw:dark:text-[#a4b3c8]">{finance.paid.length}</span></header>{finance.paid.length ? <div className="tw:grid tw:gap-2">{finance.paid.map((entry) => <article key={entry.id} className="tw:flex tw:items-start tw:justify-between tw:gap-3 tw:rounded-xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-3 tw:dark:border-[#2a4161] tw:dark:bg-[#102441]"><div className="tw:min-w-0"><strong className="tw:block tw:break-words tw:text-sm">{entry.description}</strong><small className="tw:mt-1 tw:block tw:text-xs tw:text-[#606874] tw:dark:text-[#a4b3c8]">Pago em {entry.paidAt || entry.dueDate}</small></div><b className="tw:shrink-0 tw:text-sm tw:text-[#08387b] tw:dark:text-[#5b92de]">{entry.amount}</b></article>)}</div> : <p className="tw:m-0 tw:text-sm tw:text-[#606874] tw:dark:text-[#a4b3c8]">Ainda não há pagamentos no histórico.</p>}</section></> },
      { id: "comandas", label: "Comandas", href: `/home?arena=${encodeURIComponent(arenaSlug)}&section=comandas`, content: <PortalClientComandas data={comandas} arenaSlug={arenaSlug}/> }
    ]}/>

  </section>;
}

function FinanceIcon({ icon }: { icon: "wallet" | "check" | "receipt" | "calendar" | "clock" }) {
  const shapes = {
    wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v12H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" /><path d="M4 9h14a2 2 0 0 1 2 2v4H14a2 2 0 0 1 0-4h6M15 13h.01" /></>,
    check: <><circle cx="12" cy="12" r="8.5" /><path d="m8 12 2.7 2.7L16.5 9" /></>,
    receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
  };
  return <svg className={viewStyles.client_finance_icon} viewBox="0 0 24 24" aria-hidden="true">{shapes[icon]}</svg>;
}

function EventNavIcon({ icon }: { icon: "calendar" | "players" | "ranking" | "rules" | "trophy" | "crown" | "target" }) {
  const shapes = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    players: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c.7-4 3-6 6-6s5.3 2 6 6M14.5 14.5c3 0 5.1 1.7 5.5 5.5" /></>,
    ranking: <><path d="M5 20V11M12 20V4M19 20v-7" /><path d="M3 20h18" /></>,
    rules: <><path d="M6 3h8l4 4v14H6V3Z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></>,
    trophy: <><path d="M8 3h8v5a4 4 0 0 1-8 0V3Z" /><path d="M8 5H4v1a4 4 0 0 0 4 4M16 5h4v1a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6" /></>,
    crown: <><path d="m4 18 2-11 6 5 6-7 2 13H4Z" /><path d="M4 21h16" /><circle cx="6" cy="6" r="1" /><circle cx="18" cy="4" r="1" /></>,
    target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /><path d="M12 1v3M12 20v3M1 12h3M20 12h3" /></>,
  };
  return <svg className={viewStyles.athlete_portal_event_icon} viewBox="0 0 24 24" aria-hidden="true">{shapes[icon]}</svg>;
}

function ReservationsPanel({ portal }: { portal: Portal }) {
  return (
    <section className={viewStyles.athlete_portal_content_panel}>
      <header>
        <span>MINHAS RESERVAS</span>
        <h2>Próximos horários</h2>
      </header>
      {portal?.reservations.length ? (
        <div className={viewStyles.portal_activity_list}>
          {portal.reservations.map((reservation) => (
            <article key={reservation.id}>
              <div>
                <strong>{reservation.title}</strong>
                <span>
                  {reservation.courtName} · {reservation.when}
                </span>
              </div>
              <b>{reservation.status}</b>
            </article>
          ))}
        </div>
      ) : (
        <PortalEmpty
          title="Nenhuma reserva futura"
          detail="Suas próximas reservas aparecerão aqui."
          action="Reservar horário"
          href={`/reservar/${portal?.arenaSlug ?? ""}`}
        />
      )}
    </section>
  );
}

function LessonsPanel({ portal }: { portal: Portal }) {
  return (
    <section className={viewStyles.athlete_portal_content_panel_athlete_portal_learning_panel}>
      <header className={viewStyles.athlete_portal_learning_heading}>
        <h2>Minhas aulas</h2>
      </header>
      {portal?.student ? <div aria-label="Créditos de aulas" className="tw:mb-4 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:rounded-md tw:border tw:border-[#b8cfee] tw:bg-white tw:p-4 tw:text-[#15385f] tw:dark:border-[#365879] tw:dark:bg-[#173d66] tw:dark:text-[#e4efff]"><div><span className="tw:block tw:text-sm">Créditos disponíveis neste mês</span>{portal.student.planName ? <small>{portal.student.planName}</small> : null}</div><strong className="tw:text-2xl tw:tabular-nums">{portal.student.remainingClasses}</strong></div> : null}
      {portal?.lessons.length ? (
        <div className={viewStyles.portal_activity_list}>
          {portal.lessons.map((lesson) => (
            <article key={lesson.id}>
              <div>
                <strong>{lesson.title}</strong>
                <span>
                  {lesson.teacherName ? `${lesson.teacherName} · ` : ""}
                  {lesson.when}
                </span>
              </div>
              <div className={viewStyles.portal_lesson_actions}><b>{lesson.checkedIn ? "Check-in realizado" : lesson.makeupRequested ? "Reposição solicitada" : lesson.status}</b>{!lesson.checkedIn && lesson.status === "Agendada" ? <SafeActionForm action={checkInPortalLessonAction} successMessage="Check-in realizado. Uma aula foi descontada do saldo deste mês."><input type="hidden" name="arenaSlug" value={portal?.arenaSlug} /><input type="hidden" name="lessonId" value={lesson.id} /><SubmitButton label="Fazer check-in" pendingLabel="Registrando..." className={viewStyles.button_button_primary_button_small} /></SafeActionForm> : null}{!lesson.checkedIn && !lesson.makeupRequested && lesson.status === "Agendada" ? <SafeActionForm action={requestPortalLessonMakeupAction} successMessage="Reposição solicitada. Seu professor será notificado."><input type="hidden" name="arenaSlug" value={portal?.arenaSlug} /><input type="hidden" name="lessonId" value={lesson.id} /><SubmitButton label="Solicitar reposição" pendingLabel="Solicitando..." className={viewStyles.button_button_small} /></SafeActionForm> : null}</div>
            </article>
          ))}
        </div>
      ) : (
        <div className={viewStyles.portal_learning_empty}><EventNavIcon icon="calendar" /><PortalEmpty title="Nenhuma aula programada" detail="Quando uma aula for agendada, ela aparecerá neste painel." /></div>
      )}
    </section>
  );
}

function classGroupRemainingSeats(group: NonNullable<Portal>["classGroups"][number]) {
  return Math.max(0, Math.min(...group.schedules.map((schedule) => schedule.capacity)) - group.enrolledCount);
}

function classGroupSeatsLabel(group: NonNullable<Portal>["classGroups"][number]) {
  const remaining = classGroupRemainingSeats(group);
  return remaining === 0 ? "Sem vagas" : `${remaining} ${remaining === 1 ? "vaga restante" : "vagas restantes"}`;
}

function ClassesPanel({ portal, weekday, arenaSlug }: { portal: Portal; weekday?: string; arenaSlug: string }) {
 const groups = portal?.classGroups ?? [];
 const names = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
 const days = [1,2,3,4,5,6,0];
 const initial = weekday && /^[0-6]$/.test(weekday) ? weekday : String(days.find(day => groups.some(group => group.schedules.some(schedule => schedule.weekday === day))) ?? 1);
 return <section className="tw:mx-3 tw:mb-20 tw:min-w-0"><h2 className="tw:sr-only">Turmas</h2><PortalLocalTabs key={arenaSlug} label="Dias das turmas" initial={initial} tabs={days.map(day => ({ id: String(day), label: names[day], content: <div className="tw:grid tw:gap-3">{groups.filter(group => group.schedules.some(schedule => schedule.weekday === day)).sort((a,b) => a.schedules.find(schedule => schedule.weekday === day)!.startTime.localeCompare(b.schedules.find(schedule => schedule.weekday === day)!.startTime) || a.teacherName.localeCompare(b.teacherName, "pt-BR")).map(group => <article key={group.id} className="tw:grid tw:min-w-0 tw:gap-3 tw:rounded-md tw:border tw:border-[#c7d8ec] tw:bg-white tw:p-4 tw:text-[#15385f] tw:dark:border-[#365879] tw:dark:bg-[#102f4b] tw:dark:text-[#e4efff]"><div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2"><strong className="tw:text-sm">{group.teacherName} · {group.name}</strong>{group.enrolled ? <span className="tw:text-xs">Você participa</span> : group.requestPending ? <span className="tw:text-xs">Solicitação enviada</span> : null}</div><div className="tw:flex tw:flex-wrap tw:gap-2">{group.schedules.filter(schedule => schedule.weekday === day).map((schedule,index) => <span key={index} className="tw:rounded tw:bg-white tw:px-3 tw:py-2 tw:text-sm tw:dark:bg-[#173d66]">{schedule.startTime} · {classGroupSeatsLabel(group)}</span>)}</div>{!group.enrolled && !group.requestPending && group.available ? <SafeActionForm action={requestClassGroupAction} successMessage="Solicitação enviada para a arena."><input type="hidden" name="arenaSlug" value={arenaSlug}/><input type="hidden" name="classGroupId" value={group.id}/><SubmitButton label="Solicitar vaga" pendingLabel="Enviando…" className={viewStyles.button_button_primary_button_small}/></SafeActionForm> : !group.available && !group.enrolled ? <small>Sem vagas</small> : null}</article>)}{!groups.some(group => group.schedules.some(schedule => schedule.weekday === day)) ? <p className="tw:text-sm tw:text-[#354f70] tw:dark:text-[#c2d5ee]">Não há turmas neste dia.</p> : null}</div> }))}/></section>;
}

function TeacherManagementIcon({ name }: { name: "plans" | "students" | "classes" | "makeups" | "agenda" }) {
  const paths = {
    plans: <><path d="M4 7h16M6 4h12v16H6z" /><path d="M9 11h6M9 14h4" /></>,
    students: <><circle cx="12" cy="8" r="3" /><path d="M5 20c.8-3.4 3.1-5 7-5s6.2 1.6 7 5" /></>,
    classes: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8M8 13h3M13 13h3" /></>,
    makeups: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M18 9h3M3 15h3M18 15h3" /></>,
    agenda: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h5" /></>,
  }[name];
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>;
}

function TeacherManagementPanel({ portal }: { portal: Portal }) {
  const management = portal?.teacherManagement;
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return (
    <section className={viewStyles.athlete_portal_content_panel_teacher_portal_management}>

      {management ? (
        <div className={viewStyles.teacher_portal_management_menu}>
          <input className={viewStyles.teacher_portal_menu_control} type="radio" name="teacher-portal-menu" id="teacher-portal-plans" defaultChecked />
          <input className={viewStyles.teacher_portal_menu_control} type="radio" name="teacher-portal-menu" id="teacher-portal-students" />
          <input className={viewStyles.teacher_portal_menu_control} type="radio" name="teacher-portal-menu" id="teacher-portal-classes" />
          <input className={viewStyles.teacher_portal_menu_control} type="radio" name="teacher-portal-menu" id="teacher-portal-makeups" />
          <input className={viewStyles.teacher_portal_menu_control} type="radio" name="teacher-portal-menu" id="teacher-portal-agenda" />
          <nav className={viewStyles.teacher_portal_submenu} aria-label="Área do Professor">
            <label htmlFor="teacher-portal-plans"><TeacherManagementIcon name="plans" /><span>Planos e preços</span></label>
            <label htmlFor="teacher-portal-students"><TeacherManagementIcon name="students" /><span>Alunos ativos</span></label>
            <label htmlFor="teacher-portal-classes"><TeacherManagementIcon name="classes" /><span>Turmas</span></label>
            <label htmlFor="teacher-portal-makeups"><TeacherManagementIcon name="makeups" /><span>Reposições</span></label>
            <label htmlFor="teacher-portal-agenda"><TeacherManagementIcon name="agenda" /><span>Agenda</span></label>
          </nav>
          <div className={viewStyles.teacher_portal_submenu_panels}>
            <article className={viewStyles.teacher_portal_management_section} data-panel="plans">
            <header><h3>Planos e preços</h3></header>
            {management.plans.length ? (
              management.plans.map((plan) => (
                <div className={viewStyles.teacher_portal_plan_row} key={plan.id}>
                  <span><strong>{plan.name}</strong><small>
                    {plan.classesPerMonth} aulas/mês ·{" "}
                    {(plan.monthlyPriceCents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </small></span>
                </div>
              ))
            ) : (
              <p>Nenhum plano vinculado.</p>
            )}
            </article>
            <article className={viewStyles.teacher_portal_management_section} data-panel="students">
            <header><h3>Alunos ativos</h3></header>
            {management.students.length ? (
              <TeacherPortalStudentList arenaSlug={portal?.arenaSlug ?? ""} students={management.students} classGroups={management.classGroups.map((group) => ({ id: group.id, name: group.name }))} />
            ) : (
              <p>Nenhum aluno ativo.</p>
            )}
            </article>
            <article className={viewStyles.teacher_portal_management_section} data-panel="classes">
            <header><h3>Turmas</h3></header>
            {management.classGroups.length ? (
              management.classGroups.map((group) => <section className={viewStyles.teacher_portal_class_group} key={group.id}>
                <header><span><strong>{group.name}</strong><small>{group.enrolledCount} aluno(s) matriculado(s)</small></span></header>
                <div className={viewStyles.teacher_portal_class_slots}>{group.schedules.map((schedule) => <SafeActionForm action={updateTeacherPortalClassGroupCapacityAction} className={viewStyles.teacher_portal_class_slot} key={schedule.id}><input type="hidden" name="arenaSlug" value={portal?.arenaSlug} /><input type="hidden" name="classGroupId" value={group.id} /><input type="hidden" name="scheduleId" value={schedule.id} /><strong>{weekdays[schedule.weekday]} · {schedule.startTime}</strong><label><span>Vagas</span><input name="capacity" type="number" min={Math.max(1, group.enrolledCount)} max="99" defaultValue={schedule.capacity} /></label><SubmitButton label="Salvar" pendingLabel="..." className={viewStyles.button_button_small} /></SafeActionForm>)}</div>
                {group.students.length ? <div className={viewStyles.teacher_portal_class_members}><span>Alunos</span>{group.students.map((student) => <small key={student.id}>{student.name}</small>)}</div> : <small className={viewStyles.teacher_portal_class_empty}>Nenhum aluno matriculado.</small>}
              </section>)
            ) : (
              <p>Nenhuma turma vinculada.</p>
            )}
            </article>
            <article className={viewStyles.teacher_portal_management_section} data-panel="makeups"><TeacherPortalMakeupPlanner arenaSlug={portal?.arenaSlug ?? ""} students={management.students} slots={management.makeupSlots} /></article>
            <article className={viewStyles.teacher_portal_management_section} data-panel="agenda">
            <header><h3>Agenda</h3></header>
            {management.agenda.length ? (
              management.agenda.map((item) => (
                <div key={item.id}>
                  <strong>{item.title}</strong>
                  <span>
                    {item.when} · {item.status}
                  </span>
                </div>
              ))
            ) : (
              <p>Nenhuma atividade futura.</p>
            )}
            </article>
          </div>
        </div>
      ) : (
        <PortalEmpty
          title="Perfil de professor indisponível"
          detail="Peça à arena para ativar o seu cadastro de professor."
        />
      )}
    </section>
  );
}

function PortalEmpty({
  title,
  detail,
  action,
  href,
}: {
  title: string;
  detail: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className={viewStyles.portal_empty}>
      <strong>{title}</strong>
      <span>{detail}</span>
      {action && href ? (
        <Link className={viewStyles.button_button_primary} href={href}>
          {action}
        </Link>
      ) : null}
    </div>
  );
}
