import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./public-standings.utilities";
import Link from "next/link";
import { PublicBookingContent } from "@/components/public-booking-content";
import type { ArenaPublicStandings, PublicArenaShell } from "@/lib/services/public-standings";
import { PublicLeaguePortal } from "@/components/tournaments/public-league-portal";
import { PublicPlayerProfile } from "@/components/public-player-profile";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { PlayerAvatar } from "@/components/player-avatar";
import { PortalRichText } from "@/components/portal-rich-text";
import { ClientPortalEventCarousel } from "@/components/client-portal-event-carousel";
import { PublicDoublesRadar } from "@/components/public-doubles-radar";
import { PublicSuper12 } from "@/components/public-super12";
import { AthletePortalNotifications } from "@/components/athlete-portal-notifications";
import { AthletePortalPrefetch } from "@/components/athlete-portal-prefetch";
import { AthletePortalLoginLayout } from "@/components/athlete-portal-login-layout";
import { AthletePortalWordmark } from "@/components/athlete-portal-wordmark";
import { logoutAthletePortalAction } from "@/lib/actions/player-auth";
import { PublicEventRadar } from "@/components/public-event-radar";
import { PublicFinanceEntryList } from "@/components/public-finance-entry-list";
import { RankingCategorySelect } from "@/components/ranking-category-select";
import { TeacherPortalStudentList } from "@/components/teacher-portal-student-list";
import { TeacherPortalMakeupPlanner } from "@/components/teacher-portal-makeup-planner";
import { PortalClientComandas } from "@/components/portal-client-comandas";
import { getPortalGreeting } from "@/lib/portal/greeting";
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
  leagueTab = "games",
  leagueCategoryId,
  bookingDate,
  teacherId,
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
  leagueTab?: LeagueTab;
  leagueCategoryId?: string;
  bookingDate?: string;
  teacherId?: string;
}) {
  const portalHref = (
    section: PortalSection,
    leagueTab?: LeagueTab,
    teacherId?: string,
    leagueCategoryId?: string,
    eventTab?: EventTab,
    super12Id?: string,
  ) => `/home?arena=${encodeURIComponent(arena.slug)}&${portalQuery(section, leagueTab, teacherId, leagueCategoryId, eventTab, super12Id).slice(1)}`;
  const publicHeader = (
    <header className={cx(viewStyles.athlete_portal_hero, "tw:viewport-700:hidden!")}>
      <div className={viewStyles.athlete_portal_hero_inner}>
        <div className={viewStyles.athlete_portal_brand}>
          {arena.athletePortalLogoUrl || arena.logoUrl ? (
            <img
              className="athlete-portal-arena-logo"
              src={arena.athletePortalLogoUrl || arena.logoUrl}
              alt={`Logo da arena ${arena.name}`}
            />
          ) : (
            <span className={viewStyles.athlete_portal_mark} aria-hidden="true">
              {arena.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className={viewStyles.athlete_portal_brand_copy}>
            <span className={viewStyles.athlete_portal_arena_name}>{arena.name}</span>
            <h1 className={viewStyles.sr_only}>Portal do Atleta</h1>
            <AthletePortalWordmark />
          </div>
        </div>
        {currentClient ? (
          <div className={viewStyles.athlete_portal_user_area}>
            <div className={viewStyles.athlete_portal_user}>
              <PlayerAvatar
                className={cx(`${viewStyles.athlete_portal_user_avatar}${notifications.some((notification) => "persistent" in notification && notification.persistent) ? " is-overdue" : ""}`)}
                photoUrl={currentClient.photoUrl}
                name={currentClient.name}
              />
              <div className={viewStyles.athlete_portal_user_copy}>
                <span>Área do atleta</span>
                <strong className={viewStyles.athlete_portal_greeting}>
                  {currentClient.name}
                </strong>
              </div>
              <details className={viewStyles.athlete_portal_arena_switcher}>
                <summary aria-label="Trocar de arena" title="Trocar de arena"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5" /><path d="M20 12a8 8 0 0 0-14.6-4.6L4 9" /><path d="M4 17v-5h5" /><path d="M4 12a8 8 0 0 0 14.6 4.6L20 15" /></svg></summary>
                <div><Link href="/portal"><b>Minhas arenas</b></Link>{athleteArenas.filter((entry) => entry.slug !== arena.slug).map((entry) => <Link href={`/classificacao/${entry.slug}`} key={entry.slug}>{entry.logoUrl ? <img src={entry.logoUrl} alt="" /> : null}<span>{entry.name}</span></Link>)}</div>
              </details>
              <Link className={viewStyles.athlete_portal_profile_link} href={portalHref("profile")}>
                Meu perfil
              </Link>
              <form action={logoutAthletePortalAction} className={viewStyles.athlete_portal_logout}><input type="hidden" name="arenaSlug" value={arena.slug} /><button type="submit">Sair</button></form>
            </div>
            <AthletePortalNotifications arenaSlug={arena.slug} notifications={notifications} />
          </div>
        ) : null}
      </div>
    </header>
  );

  if (!currentClient)
    return <AthletePortalLoginLayout arena={{ name: arena.name, logoUrl: arena.athletePortalLogoUrl || arena.logoUrl }}>{authForm}</AthletePortalLoginLayout>;

  const portalVisibility = arena;
  const requestedSection: string =
    section === "leagues" && !portalVisibility.athletePortalShowLeagues
      ? "profile"
      : section === "booking" && !portalVisibility.athletePortalShowBooking
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
              : section;
  const selectedLeagueTab: LeagueTab =
    leagueTab === "pairs" ||
    leagueTab === "ranking" ||
    leagueTab === "rules" ||
    leagueTab === "prizes"
      ? leagueTab
      : "games";
  const selectedEventTab: EventTab = eventTab === "super12" || eventTab === "radar" ? eventTab : "leagues";
  const homeShortcuts: { label: string; href: string; icon: "calendar" | "graduation" | "trophy" | "players" }[] = [
    { label: "Eventos", href: portalHref("leagues", "games"), icon: "calendar" },
    ...(portalVisibility.athletePortalShowLessons || portalVisibility.athletePortalShowClasses
      ? [{ label: "Aulas", href: portalHref(portalVisibility.athletePortalShowLessons ? "lessons" : "classes"), icon: "graduation" as const }]
      : []),
    ...(portalVisibility.athletePortalShowLeagues
      ? [{ label: "Torneios", href: portalHref("leagues", "games"), icon: "trophy" as const }]
      : []),
    ...(portalVisibility.athletePortalShowDoublesRadar
      ? [{ label: "Radar de duplas", href: portalHref("radar"), icon: "players" as const }]
      : []),
    ...(currentClient.isTeacher ? [{ label: "Área do Professor", href: portalHref("teacher"), icon: "graduation" as const }] : []),
    { label: "Minhas comandas", href: portalHref("comandas"), icon: "players" },
  ];

  return (
    <main className={cx(viewStyles.athlete_portal_page, "tw:viewport-700:bg-[#f5f8f8]! tw:viewport-700:text-[#133047]! tw:viewport-700:dark:bg-[#061c2a]! tw:viewport-700:dark:text-[#eff8f8]!")}>
      {publicHeader}
      <header className="tw:hidden tw:viewport-700:flex tw:items-center tw:justify-between tw:gap-3 tw:px-4 tw:pt-3 tw:pb-2" aria-label="Cabeçalho do portal">
        <div className="tw:flex tw:min-w-0 tw:items-center tw:gap-2">
          {requestedSection !== "home" ? <Link href={portalHref("home")} className="tw:grid tw:size-10 tw:shrink-0 tw:place-items-center tw:rounded-full tw:bg-white tw:text-[#133047] tw:dark:bg-[#102f42] tw:dark:text-[#eff8f8]" aria-label="Voltar ao início">←</Link> : null}
          {arena.athletePortalLogoUrl || arena.logoUrl ? <img src={arena.athletePortalLogoUrl || arena.logoUrl} alt="" className="tw:size-9 tw:shrink-0 tw:rounded-lg tw:object-contain" /> : <span className="tw:grid tw:size-9 tw:shrink-0 tw:place-items-center tw:rounded-lg tw:bg-[#078f7c] tw:text-sm tw:text-white tw:dark:bg-[#5bdec1] tw:dark:text-[#082b34]">{arena.name.slice(0, 1).toUpperCase()}</span>}
          <strong className="tw:truncate tw:text-sm tw:font-semibold">{arena.name}</strong>
        </div>
        <div className="tw:flex tw:shrink-0 tw:items-center tw:gap-2"><AthletePortalNotifications arenaSlug={arena.slug} notifications={notifications} /><Link href={portalHref("profile")} aria-label="Meu perfil" className="tw:grid tw:size-9 tw:place-items-center tw:rounded-full tw:bg-[#def2ed] tw:text-xs tw:font-semibold tw:text-[#078f7c] tw:dark:bg-[#144c4e] tw:dark:text-[#5bdec1]">{currentClient.name.trim().slice(0, 1).toUpperCase()}</Link></div>
      </header>
      <AthletePortalPrefetch hrefs={[portalHref("home"), portalHref("announcements"), portalHref("leagues", "games"), portalHref("lessons"), portalHref("profile"), portalHref("radar"), portalHref("comandas")]} />
      {requestedSection !== "home" ? <div className={cx(viewStyles.athlete_portal_back, "tw:viewport-700:hidden!")}><Link href={portalHref("home")}>← Voltar ao início</Link></div> : null}
      {requestedSection === "lessons" || requestedSection === "classes" ? (
        <nav
          className={viewStyles.athlete_portal_league_nav_athlete_portal_learning_tabs}
          aria-label="Menu de aulas"
        >
          {portalVisibility.athletePortalShowLessons ? (
            <Link
              className={cx(requestedSection === "lessons" ? "active" : "")}
              href={portalHref("lessons")}
            >
              <EventNavIcon icon="calendar" /><span>Minhas aulas</span>
            </Link>
          ) : null}
          {portalVisibility.athletePortalShowClasses ? (
            <Link
              className={cx(requestedSection === "classes" ? "active" : "")}
              href={portalHref("classes")}
            >
              <EventNavIcon icon="players" /><span>Turmas</span>
            </Link>
          ) : null}
        </nav>
      ) : null}
      {requestedSection === "profile" || requestedSection === "finance" || requestedSection === "comandas" ? (
        <nav className={cx(viewStyles.athlete_portal_league_nav, requestedSection === "finance" ? "tw:viewport-700:hidden!" : "")} aria-label="Menu do meu perfil">
          <Link className={cx(requestedSection === "profile" ? "active" : "")} href={portalHref("profile")}>Dados pessoais</Link>
          <Link className={cx(requestedSection === "finance" ? "active" : "")} href={portalHref("finance")}>Finanças</Link>
          <Link className={cx(requestedSection === "comandas" ? "active" : "")} href={portalHref("comandas")}>Minhas comandas</Link>
        </nav>
      ) : null}
      {requestedSection === "home" ? (
        <ClientHomePanel home={home} name={currentClient.name} arenaSlug={arena.slug} shortcuts={homeShortcuts} />
      ) : requestedSection === "announcements" ? (
        <section className={viewStyles.athlete_portal_content_panel_portal_announcements_feed}><header><span>AVISOS DA ARENA</span><h2>Feed de avisos</h2></header>{home!.announcements.length ? home!.announcements.map((announcement) => <article key={announcement.id}>{announcement.pinned ? <span className={viewStyles.portal_announcement_pinned}>Fixado</span> : null}<strong>{announcement.title}</strong><p><PortalRichText text={announcement.message} /></p>{announcement.linkUrl ? <a className={viewStyles.portal_announcement_link} href={announcement.linkUrl} target="_blank" rel="noreferrer">Abrir link <span aria-hidden="true">↗</span></a> : null}</article>) : <p className={viewStyles.muted}>A arena ainda não divulgou avisos.</p>}</section>
      ) : requestedSection === "finance" ? (
        <ClientFinancePanel finance={finance} arenaSlug={arena.slug} tab={financeTab} />
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
        <>
          <section className={cx(viewStyles.athlete_portal_events_shell, "tw:viewport-700:mx-3! tw:viewport-700:w-[calc(100%_-_24px)]! tw:viewport-700:pb-24! tw:viewport-700:text-[#133047] tw:viewport-700:dark:text-[#eff8f8]")}>
          <details className="tw:relative tw:mb-3 tw:hidden tw:viewport-700:block"><summary className="tw:flex tw:min-h-10 tw:cursor-pointer tw:items-center tw:justify-between tw:rounded-xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:px-3 tw:text-sm tw:font-semibold tw:text-[#133047] tw:dark:border-[#244759] tw:dark:bg-[#102f42] tw:dark:text-[#eff8f8]">{selectedEventTab === "super12" ? "Super 12" : selectedEventTab === "radar" ? "Radar de Torneios" : "Torneios"}<span aria-hidden="true">⌄</span></summary><nav className="tw:absolute tw:z-20 tw:mt-1 tw:grid tw:w-full tw:gap-1 tw:rounded-xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-2 tw:shadow-lg tw:dark:border-[#244759] tw:dark:bg-[#102f42]" aria-label="Tipos de eventos"><Link className="tw:rounded-lg tw:p-2 tw:text-sm tw:text-[#133047] tw:no-underline tw:dark:text-[#eff8f8]" href={portalHref("leagues", "games", undefined, leagueCategoryId, "leagues")}>Torneios</Link><Link className="tw:rounded-lg tw:p-2 tw:text-sm tw:text-[#133047] tw:no-underline tw:dark:text-[#eff8f8]" href={portalHref("leagues", undefined, undefined, undefined, "super12", super12Id)}>Super 12</Link><Link className="tw:rounded-lg tw:p-2 tw:text-sm tw:text-[#133047] tw:no-underline tw:dark:text-[#eff8f8]" href={portalHref("leagues", undefined, undefined, undefined, "radar")}>Radar de Torneios</Link></nav></details>
          <nav className={cx(viewStyles.athlete_portal_events_nav, "tw:viewport-700:hidden!")} aria-label="Menu de Eventos">
            <Link className={cx(selectedEventTab === "leagues" ? "active" : "")} href={portalHref("leagues", "games", undefined, leagueCategoryId, "leagues")}><EventNavIcon icon="trophy" /><span><strong>Torneios</strong><small>Competições regulares</small></span></Link>
            <Link className={cx(selectedEventTab === "super12" ? "active" : "")} href={portalHref("leagues", undefined, undefined, undefined, "super12", super12Id)}><EventNavIcon icon="crown" /><span><strong>Super 12</strong><small>Os melhores no ano</small></span></Link>
            <Link className={cx(selectedEventTab === "radar" ? "active" : "")} href={portalHref("leagues", undefined, undefined, undefined, "radar")}><EventNavIcon icon="target" /><span><strong>Radar de Torneios</strong><small>Torneios próximos</small></span></Link>
          </nav>
          {selectedEventTab === "leagues" ? <>
          <nav className="tw:mb-3 tw:hidden tw:viewport-700:grid tw:grid-cols-4 tw:border-b tw:border-[#d8e5e9] tw:dark:border-[#244759]" aria-label="Menu da Liga"><Link href={portalHref("leagues", "games", undefined, leagueCategoryId)} className={cx("tw:py-3 tw:text-center tw:text-xs tw:font-medium tw:no-underline", selectedLeagueTab === "games" ? "tw:border-b-2 tw:border-[#078f7c] tw:text-[#078f7c] tw:dark:border-[#5bdec1] tw:dark:text-[#5bdec1]" : "tw:text-[#607e8d] tw:dark:text-[#a1bccb]")}>Jogos</Link><Link href={portalHref("leagues", "ranking", undefined, leagueCategoryId)} className={cx("tw:py-3 tw:text-center tw:text-xs tw:font-medium tw:no-underline", selectedLeagueTab === "ranking" ? "tw:border-b-2 tw:border-[#078f7c] tw:text-[#078f7c] tw:dark:border-[#5bdec1] tw:dark:text-[#5bdec1]" : "tw:text-[#607e8d] tw:dark:text-[#a1bccb]")}>Ranking</Link><Link href={portalHref("leagues", "pairs", undefined, leagueCategoryId)} className={cx("tw:py-3 tw:text-center tw:text-xs tw:font-medium tw:no-underline", selectedLeagueTab === "pairs" ? "tw:border-b-2 tw:border-[#078f7c] tw:text-[#078f7c] tw:dark:border-[#5bdec1] tw:dark:text-[#5bdec1]" : "tw:text-[#607e8d] tw:dark:text-[#a1bccb]")}>Duplas</Link><details className="tw:relative"><summary className="tw:grid tw:min-h-10 tw:cursor-pointer tw:place-items-center tw:text-xs tw:text-[#607e8d] tw:dark:text-[#a1bccb]" aria-label="Mais opções da Liga">•••</summary><div className="tw:absolute tw:right-0 tw:z-20 tw:grid tw:min-w-32 tw:rounded-xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-2 tw:shadow-lg tw:dark:border-[#244759] tw:dark:bg-[#102f42]"><Link className="tw:p-2 tw:text-sm tw:text-[#133047] tw:no-underline tw:dark:text-[#eff8f8]" href={portalHref("leagues", "rules", undefined, leagueCategoryId)}>Regras</Link><Link className="tw:p-2 tw:text-sm tw:text-[#133047] tw:no-underline tw:dark:text-[#eff8f8]" href={portalHref("leagues", "prizes", undefined, leagueCategoryId)}>Premiação</Link></div></details></nav>
          <nav className={cx(viewStyles.athlete_portal_event_tabs, "tw:viewport-700:hidden!")} aria-label="Menu da Liga">
            <Link
              className={cx(selectedLeagueTab === "games" ? "active" : "")}
              href={portalHref("leagues", "games", undefined, leagueCategoryId)}
            >
              <EventNavIcon icon="calendar" /><span>Jogos</span>
            </Link>
            <Link
              className={cx(selectedLeagueTab === "pairs" ? "active" : "")}
              href={portalHref("leagues", "pairs", undefined, leagueCategoryId)}
            >
              <EventNavIcon icon="players" /><span>Duplas</span>
            </Link>
            <Link
              className={cx(selectedLeagueTab === "ranking" ? "active" : "")}
              href={portalHref(
                "leagues",
                "ranking",
                undefined,
                leagueCategoryId,
              )}
            >
              <EventNavIcon icon="ranking" /><span>Ranking</span>
            </Link>
            <Link
              className={cx(selectedLeagueTab === "rules" ? "active" : "")}
              href={portalHref("leagues", "rules", undefined, leagueCategoryId)}
            >
              <EventNavIcon icon="rules" /><span>Regras</span>
            </Link>
            <Link
              className={cx(selectedLeagueTab === "prizes" ? "active" : "")}
              href={portalHref(
                "leagues",
                "prizes",
                undefined,
                leagueCategoryId,
              )}
            >
              <EventNavIcon icon="trophy" /><span>Premiação</span>
            </Link>
          </nav>
          {selectedLeagueTab === "games" || selectedLeagueTab === "pairs" ? (
            portal ? (
              <PublicLeaguePortal
                arenaSlug={arena.slug}
                playerName={currentClient.name}
                portal={portal}
                view={selectedLeagueTab}
                showPrize={false}
              />
            ) : (
              <section className={viewStyles.athlete_portal_content_panel}>
                <PortalEmpty
                  title="Portal indisponível"
                  detail="Não foi possível carregar os dados do atleta neste momento."
                />
              </section>
            )
          ) : null}
          {selectedLeagueTab === "rules" && data ? <RulesPanel data={data} /> : null}
          {selectedLeagueTab === "ranking" ? (
            data ? <RankingPanel arenaSlug={arena.slug} data={data} /> : null
          ) : null}
          {selectedLeagueTab === "prizes" ? (
            <PrizePanel portal={portal} />
          ) : null}
          </> : selectedEventTab === "super12" ? <PublicSuper12 arenaSlug={arena.slug} data={super12} /> : <PublicEventRadar embedded view={eventRadarView} embeddedHref={(view) => `${portalHref("leagues", undefined, undefined, undefined, "radar")}&eventRadarView=${view}`} />}
          </section>
        </>
      ) : requestedSection === "booking" ? (
        <PublicBookingContent
          arenaSlug={arena.slug}
          date={bookingDate}
          embedded
        />
      ) : requestedSection === "reservations" ? (
        <ReservationsPanel portal={portal} />
      ) : requestedSection === "lessons" ? (
        <LessonsPanel portal={portal} />
      ) : requestedSection === "classes" ? (
        <ClassesPanel portal={portal} teacherId={teacherId} arenaSlug={arena.slug} />
      ) : requestedSection === "teacher" && currentClient.isTeacher ? (
        <TeacherManagementPanel portal={portal} />
      ) : (
        <PublicPlayerProfile
          arenaSlug={arena.slug}
          player={currentClient}
        />
      )}
      <nav className={cx(viewStyles.athlete_portal_bottom_nav, "tw:viewport-700:bg-white! tw:viewport-700:dark:bg-[#102b3d]! tw:viewport-700:[&_a]:text-[#668492]! tw:viewport-700:dark:[&_a]:text-[#a1bccb]! tw:viewport-700:[&_a.active]:text-[#078f7c]! tw:viewport-700:dark:[&_a.active]:text-[#5bdec1]!")} aria-label="Atalhos principais">
        <Link className={cx(requestedSection === "home" ? "active" : "")} href={portalHref("home")}><PortalNavIcon icon="home" /><span>Início</span></Link>
        <Link className={cx(requestedSection === "leagues" ? "active" : "")} href={portalHref("leagues", "games")}><PortalNavIcon icon="calendar" /><span>Eventos</span></Link>
        <Link className={cx(requestedSection === "lessons" || requestedSection === "classes" ? "active" : "")} href={portalHref(portalVisibility.athletePortalShowLessons ? "lessons" : "classes")}><PortalNavIcon icon="graduation" /><span>Aulas</span></Link>
        <Link className={cx(requestedSection === "radar" ? "active" : "")} href={portalHref("radar")}><PortalNavIcon icon="players" /><span>Duplas</span></Link>
      </nav>
    </main>
  );
}

function ClientFinancePanel({ finance, arenaSlug, tab }: { finance: ClientFinance; arenaSlug: string; tab: "upcoming" | "history" }) {
  if (!finance) return <section className={viewStyles.athlete_portal_content_panel}><PortalEmpty title="Finanças indisponíveis" detail="Não foi possível carregar suas informações financeiras agora." /></section>;
  const pendingCount = finance.overdue.length + finance.comandas.length;
  const message = finance.health === "healthy"
    ? { title: "Tudo certo por aqui, padelista! 🎾", detail: "Quadra livre, contas em ordem e foco no próximo voleio." }
    : finance.health === "upcoming"
      ? { title: "Tudo certo por aqui, padelista! 🎾", detail: finance.open.length ? "Seus próximos pagamentos já estão na linha. Quem mantém as contas em ordem, acerta 85% mais voleios." : "Você tem comandas em andamento. Acompanhe seu consumo e feche-as no balcão quando terminar." }
      : { title: "Vamos virar esse jogo? 🎾", detail: "Tem uma pendência pedindo atenção. Resolva agora e volte para a quadra com a cabeça leve." };
  const mobileAttention = finance.overdue.length ? "overdue" : finance.open.some((entry) => entry.urgency === "soon") ? "soon" : "healthy";
  return <section className={cx(viewStyles.client_finance_page, "tw:viewport-700:gap-3! tw:viewport-700:pb-24!")}>
    <div className="tw:hidden tw:viewport-700:block"><h2 className="tw:mb-3 tw:text-[1.4rem] tw:font-semibold">Finanças</h2><div className="tw:grid tw:grid-cols-2 tw:gap-2"><div className="tw:rounded-2xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-3 tw:dark:border-[#244759] tw:dark:bg-[#102f42]"><small className="tw:block tw:text-[#607e8d] tw:dark:text-[#a1bccb]">Pendências</small><strong className="tw:mt-1 tw:block tw:text-xl">{pendingCount}</strong></div><div className="tw:rounded-2xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-3 tw:dark:border-[#244759] tw:dark:bg-[#102f42]"><small className="tw:block tw:text-[#607e8d] tw:dark:text-[#a1bccb]">Próximos 15 dias</small><strong className="tw:mt-1 tw:block tw:text-xl">{finance.open.length}</strong></div></div><p className={cx("tw:mt-3 tw:text-xs tw:font-medium", mobileAttention === "overdue" ? "tw:text-[#b42318] tw:dark:text-[#ff9e8f]" : mobileAttention === "soon" ? "tw:text-[#a86100] tw:dark:text-[#ffd18a]" : "tw:text-[#087b63] tw:dark:text-[#5bdec1]")}>{mobileAttention === "overdue" ? "Há pagamento em atraso" : mobileAttention === "soon" ? "Há pagamento vencendo em até 3 dias" : "Seus pagamentos estão em dia"}</p></div>
    <header className={cx(`${viewStyles.client_finance_hero} is-${finance.health}`, "tw:viewport-700:hidden!")}>
      <span>FINANÇAS</span>
      <div><div className={viewStyles.client_finance_orb} aria-hidden="true"><FinanceIcon icon="wallet" /></div><div><h2>{message.title}</h2><p>{message.detail}</p></div></div>
      <b className={viewStyles.client_finance_motto}>DISCIPLINA<br />TAMBÉM<br />JOGA.</b>
    </header>
    <div className={cx(viewStyles.client_finance_summary, "tw:viewport-700:hidden!")} aria-label="Resumo financeiro">
      <article className={cx(pendingCount ? viewStyles.is_attention : "is-healthy")}><span><FinanceIcon icon={pendingCount ? "receipt" : "check"} /></span><div><b>{pendingCount ? "Em aberto" : "Em dia"}</b><small>{pendingCount ? `${pendingCount} ${pendingCount === 1 ? "item" : "itens"} para acompanhar` : "Suas finanças organizadas"}</small></div></article>
      <article><span><FinanceIcon icon="receipt" /></span><div><b>Em aberto</b><strong>{pendingCount}</strong></div></article>
      <article><span><FinanceIcon icon="calendar" /></span><div><b>Próximos</b><strong>{finance.open.length}</strong></div></article>
    </div>
    <nav className={cx(viewStyles.client_finance_tabs, "tw:viewport-700:border-0! tw:viewport-700:border-b! tw:viewport-700:border-[#d8e5e9]! tw:viewport-700:rounded-none! tw:viewport-700:bg-transparent! tw:viewport-700:p-0! tw:viewport-700:dark:border-[#244759]! tw:viewport-700:[&_a]:rounded-none! tw:viewport-700:[&_a]:bg-transparent! tw:viewport-700:[&_a]:text-[#607e8d]! tw:viewport-700:dark:[&_a]:text-[#a1bccb]! tw:viewport-700:[&_a.active]:border-b-2! tw:viewport-700:[&_a.active]:border-[#078f7c]! tw:viewport-700:[&_a.active]:bg-transparent! tw:viewport-700:[&_a.active]:[background-image:none]! tw:viewport-700:[&_a.active]:shadow-none! tw:viewport-700:[&_a.active]:text-[#078f7c]! tw:viewport-700:dark:[&_a.active]:border-[#5bdec1]! tw:viewport-700:dark:[&_a.active]:text-[#5bdec1]!")} aria-label="Navegação financeira"><Link className={cx(tab === "upcoming" ? "active" : "")} href={`/home?arena=${encodeURIComponent(arenaSlug)}&section=finance`}>Lançamentos</Link><Link className={cx(tab === "history" ? "active" : "")} href={`/home?arena=${encodeURIComponent(arenaSlug)}&section=finance&financeTab=history`}>Histórico</Link><Link className="tw:hidden tw:viewport-700:block" href={`/home?arena=${encodeURIComponent(arenaSlug)}&section=comandas`}>Comandas</Link></nav>
    {tab === "upcoming" ? <PublicFinanceEntryList arenaSlug={arenaSlug} overdue={finance.overdue} open={finance.open} comandas={finance.comandas} /> : <section className={cx(viewStyles.client_finance_section, "tw:viewport-700:border-[#d8e5e9]! tw:viewport-700:bg-white! tw:viewport-700:[background-image:none]! tw:viewport-700:dark:border-[#244759]! tw:viewport-700:dark:bg-[#102f42]! tw:viewport-700:[&_h3]:text-[#133047]! tw:viewport-700:dark:[&_h3]:text-[#eff8f8]!")}><header><div><span className={viewStyles.client_finance_section_icon}><FinanceIcon icon="receipt" /></span><h3>Histórico de pagamentos</h3></div><span>{finance.paid.length}</span></header>{finance.paid.length ? finance.paid.map((entry) => <article className={cx(viewStyles.client_finance_entry, "tw:viewport-700:[&_strong]:text-[#133047]! tw:viewport-700:[&_b]:text-[#133047]! tw:viewport-700:[&_small]:text-[#607e8d]! tw:viewport-700:dark:[&_strong]:text-[#eff8f8]! tw:viewport-700:dark:[&_b]:text-[#eff8f8]! tw:viewport-700:dark:[&_small]:text-[#a1bccb]!")} key={entry.id}><div><strong>{entry.description}</strong><small>Pago em {entry.paidAt || entry.dueDate}</small></div><b>{entry.amount}</b><em>Pago</em></article>) : <p className={viewStyles.client_finance_empty}>Quando houver pagamentos, eles aparecerão aqui.</p>}</section>}
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

function PortalNavIcon({ icon }: { icon: "home" | "calendar" | "graduation" | "trophy" | "players" | "money" }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    graduation: <><path d="m3 9 9-5 9 5-9 5-9-5Z" /><path d="M7 11.2V16c2.8 2 7.2 2 10 0v-4.8M21 9v6" /></>,
    trophy: <><path d="M8 3h8v5a4 4 0 0 1-8 0V3Z" /><path d="M8 5H4v1a4 4 0 0 0 4 4M16 5h4v1a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6" /></>,
    players: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c.7-4 3-6 6-6s5.3 2 6 6M14.5 14.5c3 0 5.1 1.7 5.5 5.5" /></>,
    money: <><circle cx="12" cy="12" r="9" /><path d="M14.8 8.6c-.6-.5-1.5-.8-2.6-.8-1.6 0-2.8.8-2.8 2s1 1.8 2.8 2.2c1.8.4 2.8 1 2.8 2.2s-1.2 2-2.8 2c-1.1 0-2.1-.4-2.8-.9M12 6.2v11.6" /></>,
  };
  return <svg className={viewStyles.portal_nav_icon} viewBox="0 0 24 24" aria-hidden="true">{paths[icon]}</svg>;
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

function ClientHomePanel({ home, name, arenaSlug, shortcuts }: { home: ClientHome; name: string; arenaSlug: string; shortcuts: { label: string; href: string; icon: "calendar" | "graduation" | "trophy" | "players" }[] }) {
  if (!home) return <section className={viewStyles.athlete_portal_content_panel}><PortalEmpty title="Início indisponível" detail="Não foi possível carregar suas informações agora." /></section>;
  const firstName = name.trim().split(/\s+/)[0] || name;
  const portalHref = (section: PortalSection) => `/home?arena=${encodeURIComponent(arenaSlug)}&section=${section}`;
  const financialStatus = home.summary.mobileFinancialStatus;
  const financialColor = financialStatus === "overdue" ? "tw:text-[#b42318] tw:dark:text-[#ff9e8f]" : financialStatus === "soon" ? "tw:text-[#a86100] tw:dark:text-[#ffd18a]" : "tw:text-[#087b63] tw:dark:text-[#5bdec1]";
  const financialSurface = financialStatus === "overdue" ? "tw:bg-[#fff0ed] tw:dark:bg-[#4a2927]" : financialStatus === "soon" ? "tw:bg-[#fff4de] tw:dark:bg-[#493921]" : "tw:bg-[#def2ed] tw:dark:bg-[#144c4e]";
  return <>
    <section className="tw:hidden tw:viewport-700:block tw:px-4 tw:pt-1 tw:pb-24">
      <p className="tw:m-0 tw:text-xs tw:text-[#607e8d] tw:dark:text-[#a1bccb]">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "America/Sao_Paulo" }).format(new Date())}</p>
      <h2 className="tw:mt-1 tw:mb-4 tw:text-[1.45rem] tw:leading-tight tw:font-semibold">{getPortalGreeting(new Date())}, {firstName}</h2>
      <div className="tw:rounded-[20px] tw:border tw:border-[#d8e5e9] tw:bg-[#ecf3f3] tw:p-4 tw:dark:border-[#244759] tw:dark:bg-[#102f42]">
        <div className="tw:flex tw:items-center tw:justify-between tw:gap-2"><span className="tw:rounded-full tw:bg-[#def2ed] tw:px-2 tw:py-1 tw:text-[.65rem] tw:font-semibold tw:text-[#078f7c] tw:dark:bg-[#144c4e] tw:dark:text-[#5bdec1]">{home.summary.reservations ? "SUAS RESERVAS" : "PRÓXIMO NA QUADRA"}</span><span className="tw:text-xs tw:text-[#607e8d] tw:dark:text-[#a1bccb]">{home.summary.reservations ? `${home.summary.reservations} futura${home.summary.reservations === 1 ? "" : "s"}` : "Quadras disponíveis"}</span></div>
        <strong className="tw:mt-4 tw:block tw:text-base tw:font-semibold">{home.summary.reservations ? "Seus próximos horários" : "Reserve sua próxima quadra"}</strong>
        <p className="tw:mt-1 tw:text-xs tw:text-[#607e8d] tw:dark:text-[#a1bccb]">{home.summary.reservations ? "Consulte os detalhes das suas reservas." : "Escolha a quadra e um horário disponível."}</p>
        <Link href={portalHref(home.summary.reservations ? "reservations" : "booking")} className="tw:mt-4 tw:block tw:rounded-xl tw:bg-[#078f7c] tw:px-4 tw:py-3 tw:text-center tw:text-sm tw:font-semibold tw:text-white tw:no-underline tw:dark:bg-[#5bdec1] tw:dark:text-[#082b34]">{home.summary.reservations ? "Ver reservas" : "Reservar quadra"}</Link>
      </div>
      <h3 className="tw:mt-5 tw:mb-2 tw:text-sm tw:font-semibold">Acesso rápido</h3>
      <nav className="tw:grid tw:grid-cols-3 tw:gap-2" aria-label="Acesso rápido"><Link href={portalHref("booking")} className="tw:flex tw:min-w-0 tw:flex-col tw:gap-3 tw:rounded-2xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-3 tw:text-xs tw:font-medium tw:text-[#133047] tw:no-underline tw:dark:border-[#244759] tw:dark:bg-[#102f42] tw:dark:text-[#eff8f8]"><PortalNavIcon icon="calendar" />Reservar</Link><Link href={portalHref("leagues")} className="tw:flex tw:min-w-0 tw:flex-col tw:gap-3 tw:rounded-2xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-3 tw:text-xs tw:font-medium tw:text-[#133047] tw:no-underline tw:dark:border-[#244759] tw:dark:bg-[#102f42] tw:dark:text-[#eff8f8]"><PortalNavIcon icon="trophy" />Torneios</Link><Link href={portalHref("finance")} className="tw:flex tw:min-w-0 tw:flex-col tw:gap-3 tw:rounded-2xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-3 tw:text-xs tw:font-medium tw:text-[#133047] tw:no-underline tw:dark:border-[#244759] tw:dark:bg-[#102f42] tw:dark:text-[#eff8f8]"><PortalNavIcon icon="money" />Finanças</Link></nav>
      <h3 className="tw:mt-5 tw:mb-2 tw:text-sm tw:font-semibold">Para acompanhar</h3>
      <div className="tw:overflow-hidden tw:rounded-2xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:dark:border-[#244759] tw:dark:bg-[#102f42]"><Link href={portalHref("finance")} className="tw:flex tw:items-center tw:justify-between tw:gap-3 tw:border-b tw:border-[#d8e5e9] tw:p-3 tw:no-underline tw:dark:border-[#244759]"><span><strong className="tw:block tw:text-sm tw:text-[#133047] tw:dark:text-[#eff8f8]">Finanças</strong><small className="tw:mt-1 tw:block tw:text-xs tw:text-[#607e8d] tw:dark:text-[#a1bccb]">Consulte seus pagamentos</small></span><span className={cx("tw:shrink-0 tw:rounded-full tw:px-2 tw:py-1 tw:text-[.65rem] tw:font-semibold", financialColor, financialSurface)}>{home.summary.mobileFinancialLabel}</span></Link><Link href={portalHref("leagues")} className="tw:flex tw:items-center tw:justify-between tw:gap-3 tw:p-3 tw:text-sm tw:text-[#133047] tw:no-underline tw:dark:text-[#eff8f8]"><span><strong className="tw:block tw:font-medium">Torneios</strong><small className="tw:mt-1 tw:block tw:text-xs tw:text-[#607e8d] tw:dark:text-[#a1bccb]">{home.summary.leagues} ativo{home.summary.leagues === 1 ? "" : "s"}</small></span><span aria-hidden="true">›</span></Link></div>
      {home.announcements.length ? <Link href={portalHref("announcements")} className="tw:mt-3 tw:block tw:rounded-2xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-3 tw:text-[#133047] tw:no-underline tw:dark:border-[#244759] tw:dark:bg-[#102f42] tw:dark:text-[#eff8f8]"><strong className="tw:block tw:text-sm">Avisos da arena</strong><small className="tw:mt-1 tw:block tw:text-xs tw:text-[#607e8d] tw:dark:text-[#a1bccb]">{home.announcements[0].title}</small></Link> : null}
    </section>
  <section className={cx(viewStyles.client_portal_home, "tw:viewport-700:hidden!")}>
    <header className={viewStyles.client_portal_welcome}><span>OLÁ,</span><h2>{firstName}</h2></header>
    <nav className={viewStyles.client_portal_shortcuts} aria-label="Atalhos do portal">{shortcuts.map((shortcut) => <Link href={shortcut.href} key={shortcut.label} className={cx(`is-${shortcut.icon}`)}><PortalNavIcon icon={shortcut.icon} /><span>{shortcut.label}</span><b aria-hidden="true">›</b></Link>)}</nav>
    <div className={viewStyles.client_portal_home_grid}>
      <Link href={portalHref("announcements")} className={viewStyles.client_portal_announcements} aria-label="Abrir feed de avisos da arena">
        <header>
          <div className={viewStyles.client_portal_section_icon}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5h4.2L16 5v14l-8.8-5.5H3v-3ZM7.2 10.5v3M7.2 13.5l1.7 5" /><path d="M19 9.5c1 .8 1.6 1.7 1.6 2.5s-.6 1.7-1.6 2.5" /></svg></div>
          <div><h3>Avisos da Arena</h3><small>Portal do atleta</small></div><b aria-hidden="true">›</b>
        </header>
        {home.announcements.length ? home.announcements.map((announcement) => <article key={announcement.id}><strong>{announcement.title}</strong><p><PortalRichText text={announcement.message} /></p></article>) : <p className={viewStyles.muted}>A arena ainda não divulgou avisos.</p>}
      </Link>
      <section className={viewStyles.client_portal_summary}><header><h3>Resumo da sua situação</h3><Link href={portalHref("finance")}>Ver detalhes <b>›</b></Link></header><div><Link className={viewStyles.client_portal_summary_link} href={portalHref("finance")}><PortalNavIcon icon="money" /><span>Financeiro</span><strong className={cx(home.summary.financialStatus === "overdue" ? "is-overdue" : home.summary.financialStatus === "pending" ? "is-pending" : "is-active")}>{home.summary.financial}</strong>{home.summary.futureFinancial ? <small className={viewStyles.client_portal_future_financial}>{home.summary.futureFinancial}</small> : null}</Link><Link className={viewStyles.client_portal_summary_link_2} href={portalHref("lessons")}><PortalNavIcon icon="graduation" /><span>Aulas</span><strong>{home.summary.classes} disponíveis</strong></Link><Link className={viewStyles.client_portal_summary_link_3} href={portalHref("reservations")}><PortalNavIcon icon="calendar" /><span>Reservas</span><strong>{home.summary.reservations} próxima{home.summary.reservations === 1 ? "" : "s"}</strong></Link><Link className={viewStyles.client_portal_summary_link_4} href={portalHref("leagues")}><PortalNavIcon icon="trophy" /><span>Torneios</span><strong>{home.summary.leagues} ativo{home.summary.leagues === 1 ? "" : "s"}</strong></Link></div></section>
    </div>
    {home.charges.length ? <section className={viewStyles.client_portal_events}><header><div><span>PAGAMENTOS</span><h3>Boletos disponíveis</h3></div></header>{home.charges.map((charge) => <article className={viewStyles.portal_payment_charge} key={charge.id}><div><strong>{charge.description}</strong><small>{charge.amount} · vence em {charge.dueDate}</small></div><a className={viewStyles.button_button_primary_button_small} href={charge.paymentUrl}>Pagar agora</a></article>)}</section> : null}
    <section className={viewStyles.client_portal_events}><header><div><span>EVENTOS DA ARENA</span><h3>Próximos eventos</h3></div><Link href="/portal/eventos">Ver todos <b>›</b></Link></header>{home.eventPosts.length ? <ClientPortalEventCarousel events={home.eventPosts} /> : <p className={viewStyles.muted}>Nenhum evento próximo. Fique de olho: a arena pode abrir novas partidas em breve.</p>}</section>
  </section></>;
}

function PrizePanel({ portal }: { portal: Portal }) {
  return (
    <section className={viewStyles.portal_league_prize_podium}>
      <div className={viewStyles.portal_league_prize_cup} aria-hidden="true">
        🏆
      </div>
      <div className={viewStyles.portal_league_prize_copy}>
        <span>PREMIAÇÃO DA LIGA</span>
        <h2>O pódio está à sua espera</h2>
        <p>Acompanhe a premiação dos seus torneios em tempo real.</p>
      </div>
      <div className={viewStyles.portal_league_prize_list}>
        {portal?.prizes.length ? (
          portal.prizes.map((prize) => (
            <article key={prize.id}>
              <strong>{prize.categoryName}</strong>
              <span>{prize.eventName}</span>
              <b className={viewStyles.portal_league_prize_description}>
                {prize.description}
              </b>
            </article>
          ))
        ) : (
          <p>A arena ainda não divulgou a premiação dos seus torneios.</p>
        )}
      </div>
    </section>
  );
}

function RulesPanel({ data }: { data: ArenaPublicStandings }) {
  return (
    <section className={viewStyles.athlete_portal_content_panel}>
      <header>
        <span>REGULAMENTO</span>
        <h2>Regras dos Torneios</h2>
      </header>
      {data.leagueRules.length ? (
        data.leagueRules.map((league) => (
          <article className={viewStyles.portal_rule} key={league.id}>
            <strong>{league.categoryName}</strong>
            <p>{league.rules}</p>
          </article>
        ))
      ) : (
        <p className={viewStyles.muted}>
          Nenhuma regra foi publicada para os torneios ativos.
        </p>
      )}
    </section>
  );
}

function RankingPanel({ arenaSlug, data }: { arenaSlug: string; data: ArenaPublicStandings }) {
  return (
    <section className={viewStyles.athlete_portal_content_panel_stack_md_portal_ranking_panel}>
      <header className={viewStyles.portal_ranking_heading}>
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V11M12 20V4M19 20v-7" /><path d="M3 20h18" /></svg>CLASSIFICAÇÃO</span>
        <h2>Ranking da Liga</h2>
      </header>
      {data.options.length ? <RankingCategorySelect arenaSlug={arenaSlug} options={data.options} selectedOptionId={data.selectedOptionId} /> : null}
      {data.selected?.kind === "GENERAL_RANKING" ? (
        <table className={viewStyles.portal_ranking_table}>
          <thead>
            <tr>
              <th>Pos.</th>
              <th>Atleta</th>
              <th>Pontos</th>
              <th>Eventos</th>
            </tr>
          </thead>
          <tbody>
            {data.selected.rows.map((row) => (
              <tr key={`${row.position}-${row.playerName}`}>
                <td>{row.position}</td>
                <td>{row.playerName}</td>
                <td>{row.points}</td>
                <td>{row.tournamentsPlayed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {data.selected?.kind === "CATEGORY" &&
      data.selected.format === "LEAGUE" ? (
        <table className={viewStyles.portal_ranking_table_2}>
          <thead>
            <tr>
              <th>Pos.</th>
              <th>Dupla</th>
              <th>Pts.</th>
              <th><span className="ranking-table-label-wide">Jogos</span><abbr className={viewStyles.ranking_table_label_compact} title="Jogos">JG</abbr></th>
              <th><span className="ranking-table-label-wide">Vitórias</span><abbr className={viewStyles.ranking_table_label_compact} title="Vitórias">V</abbr></th>
              <th><span className="ranking-table-label-wide">Derrotas</span><abbr className={viewStyles.ranking_table_label_compact} title="Derrotas">D</abbr></th>
              <th><span className="ranking-table-label-wide">Saldo</span><abbr className={viewStyles.ranking_table_label_compact} title="Saldo">SAL</abbr></th>
            </tr>
          </thead>
          <tbody>
            {data.selected.leagueStandings.map((standing) => (
              <tr key={standing.position}>
                <td>{standing.position}</td>
                <td>{standing.pairName}</td>
                <td>{standing.points}</td>
                <td>{standing.matches}</td>
                <td>{standing.victories}</td>
                <td>{standing.losses}</td>
                <td>{standing.differential}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {!data.selected ? (
        <p className={viewStyles.muted}>Nenhuma classificação publicada neste momento.</p>
      ) : null}
    </section>
  );
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
        <span>AULAS</span>
        <h2>Suas próximas aulas</h2>
        <p>Acompanhe aqui as aulas que você já agendou.</p>
      </header>
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
        <div className={viewStyles.portal_learning_empty}><EventNavIcon icon="calendar" /><PortalEmpty title="Nenhuma aula programada" detail="Quando uma aula for agendada, ela aparecerá neste painel." /><b>EVOLUÇÃO TAMBÉM SE CONSTRÓI<br />COM PLANEJAMENTO</b></div>
      )}
    </section>
  );
}

function ClassesPanel({
  portal,
  teacherId,
  arenaSlug,
}: {
  portal: Portal;
  teacherId?: string;
  arenaSlug: string;
}) {
  const teachers = portal?.teachers ?? [];
  const selectedTeacher = teachers.find((teacher) => teacher.id === teacherId);
  const selectedClassGroups = selectedTeacher
    ? (portal?.classGroups ?? [])
        .filter((group) => group.teacherId === selectedTeacher.id)
        .sort((first, second) => {
          const firstSchedule = [...first.schedules].sort(
            (a, b) =>
              a.weekday - b.weekday || a.startTime.localeCompare(b.startTime),
          )[0];
          const secondSchedule = [...second.schedules].sort(
            (a, b) =>
              a.weekday - b.weekday || a.startTime.localeCompare(b.startTime),
          )[0];
          return (
            (firstSchedule?.weekday ?? 7) - (secondSchedule?.weekday ?? 7) ||
            (firstSchedule?.startTime ?? "").localeCompare(
              secondSchedule?.startTime ?? "",
            )
          );
        })
    : [];
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return (
    <section className={viewStyles.athlete_portal_content_panel_athlete_portal_learning_panel_2}>
      <header className={viewStyles.athlete_portal_learning_heading}>
        <span>TURMAS</span>
        <h2>Encontre sua turma</h2>
        <p>Escolha um professor para ver as turmas disponíveis.</p>
        <EventNavIcon icon="players" />
      </header>
      <div className={viewStyles.portal_teacher_picker}>
        <strong>Professores</strong>
        {teachers.length ? (
          <div>
            {teachers.map((teacher) => (
              <Link
                className={cx(selectedTeacher?.id === teacher.id ? "active" : "")}
                href={`/home?arena=${encodeURIComponent(arenaSlug)}&section=classes&teacher=${encodeURIComponent(teacher.id)}`}
                key={teacher.id}
              >
                {teacher.name}
              </Link>
            ))}
          </div>
        ) : (
          <span>Nenhum professor ativo cadastrado.</span>
        )}
      </div>
      {selectedTeacher ? (
        <section className={viewStyles.portal_selected_teacher_section}>
          <strong className={viewStyles.portal_selected_teacher}>
            Turmas de {selectedTeacher.name}
          </strong>
          <div className={viewStyles.portal_class_group_list}>
            {selectedClassGroups.length ? (
              selectedClassGroups.map((group) => (
                <article
                  key={group.id}
                  className={
                    cx(group.available
                      ? "portal-class-group-available"
                      : "portal-class-group-full")
                  }
                >
                  <div>
                    <strong>{group.name}</strong>
                    <small>
                      {group.schedules
                        .map(
                          (schedule) =>
                            `${weekdays[schedule.weekday]} ${schedule.startTime} · ${schedule.capacity} vagas`,
                        )
                        .join("  |  ")}
                    </small>
                  </div>
                  {group.enrolled ? (
                    <b>Você participa</b>
                  ) : group.requestPending ? (
                    <b>Solicitação enviada</b>
                  ) : group.available ? (
                    <SafeActionForm
                      action={requestClassGroupAction}
                      successMessage="Solicitação enviada para a arena."
                    >
                      <input
                        type="hidden"
                        name="arenaSlug"
                        value={portal?.arenaSlug ?? ""}
                      />
                      <input
                        type="hidden"
                        name="classGroupId"
                        value={group.id}
                      />
                      <SubmitButton
                        label="Solicitar vaga"
                        pendingLabel="Enviando..."
                        className={viewStyles.button_button_primary_button_small}
                      />
                    </SafeActionForm>
                  ) : (
                    <b>Sem vagas</b>
                  )}
                </article>
              ))
            ) : (
              <p className={viewStyles.muted}>
                Este professor não possui turmas disponíveis no momento.
              </p>
            )}
          </div>
        </section>
      ) : (
        <p className={viewStyles.portal_teacher_hint}>
          Escolha um professor para ver as turmas disponíveis.
        </p>
      )}
    </section>
  );
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
      <header>
        <span>GESTÃO DO PROFESSOR</span>
        <h2>Área do Professor</h2><p>Gerencie saldos, turmas e avisos dos seus alunos.</p>
      </header>
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
            <header><h3>Planos e preços</h3><p>Consulte os planos usados pelos seus alunos.</p></header>
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
            <header><h3>Alunos ativos</h3><p>Selecione um aluno para gerenciar saldo, reposições, turma e avisos.</p></header>
            {management.students.length ? (
              <TeacherPortalStudentList arenaSlug={portal?.arenaSlug ?? ""} students={management.students} classGroups={management.classGroups.map((group) => ({ id: group.id, name: group.name }))} />
            ) : (
              <p>Nenhum aluno ativo.</p>
            )}
            </article>
            <article className={viewStyles.teacher_portal_management_section} data-panel="classes">
            <header><h3>Turmas</h3><p>Consulte os grupos. Para ajustar um aluno, abra-o em Alunos ativos.</p></header>
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
            <header><h3>Agenda</h3><p>Visualize os próximos compromissos.</p></header>
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
