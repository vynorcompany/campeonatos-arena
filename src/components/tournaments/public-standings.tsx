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
import { PublicEventRadar } from "@/components/public-event-radar";
import {
  moveClassGroupStudentAction,
  registerClassGroupMakeupAction,
  requestClassGroupAction,
} from "@/lib/actions/class-groups";

type Portal = Awaited<
  ReturnType<
    typeof import("@/lib/services/public-league-portal").getPublicLeaguePortal
  >
>;
type ClientHome = Awaited<ReturnType<typeof import("@/lib/services/public-client-home").getPublicClientHome>>;
type ClientFinance = Awaited<ReturnType<typeof import("@/lib/services/public-client-home").getPublicClientFinance>>;
type AthleteNotifications = Awaited<ReturnType<typeof import("@/lib/services/public-player-notifications").getAthletePortalNotifications>>;
type PortalSection =
  | "home"
  | "finance"
  | "leagues"
  | "booking"
  | "reservations"
  | "lessons"
  | "classes"
  | "profile"
  | "radar"
  | "teacher";
type LeagueTab = "games" | "pairs" | "ranking" | "rules" | "prizes";
type EventTab = "leagues" | "super12" | "radar";

function portalHref(
  section: PortalSection,
  leagueTab?: LeagueTab,
  teacherId?: string,
  leagueCategoryId?: string,
  eventTab?: EventTab,
  super12Id?: string,
) {
  const query = new URLSearchParams({
    section,
    tab:
      leagueTab === "ranking"
        ? "ranking"
        : leagueTab === "rules"
          ? "rules"
          : leagueTab === "prizes"
            ? "portal"
            : "games",
  });
  if (leagueTab) query.set("leagueTab", leagueTab);
  if (eventTab) query.set("eventTab", eventTab);
  if (super12Id) query.set("super12", super12Id);
  if (teacherId) query.set("teacher", teacherId);
  if (leagueCategoryId) query.set("leagueCategory", leagueCategoryId);
  return `?${query.toString()}`;
}

export function PublicStandings({
  data,
  arena,
  currentClient,
  athleteArenas,
  portal,
  home,
  finance,
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
  const publicHeader = (
    <header className="athlete-portal-hero">
      <div className="athlete-portal-hero-inner">
        <div className="athlete-portal-brand">
          {arena.athletePortalLogoUrl || arena.logoUrl ? (
            <img
              className="athlete-portal-arena-logo"
              src={arena.athletePortalLogoUrl || arena.logoUrl}
              alt={`Logo da arena ${arena.name}`}
            />
          ) : (
            <span className="athlete-portal-mark" aria-hidden="true">
              {arena.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="athlete-portal-brand-copy">
            <span className="athlete-portal-arena-name">{arena.name}</span>
            <h1>Portal do Atleta</h1>
          </div>
        </div>
        {currentClient ? (
          <div className="athlete-portal-user-area">
            <div className="athlete-portal-user">
              <PlayerAvatar
                className="athlete-portal-user-avatar"
                photoUrl={currentClient.photoUrl}
                name={currentClient.name}
              />
              <div className="athlete-portal-user-copy">
                <span>Área do atleta</span>
                <strong className="athlete-portal-greeting">
                  {currentClient.name}
                </strong>
              </div>
              <details className="athlete-portal-arena-switcher">
                <summary aria-label="Trocar de arena" title="Trocar de arena"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5" /><path d="M20 12a8 8 0 0 0-14.6-4.6L4 9" /><path d="M4 17v-5h5" /><path d="M4 12a8 8 0 0 0 14.6 4.6L20 15" /></svg></summary>
                <div><Link href="/portal"><b>Minhas arenas</b></Link>{athleteArenas.filter((entry) => entry.slug !== arena.slug).map((entry) => <Link href={`/classificacao/${entry.slug}`} key={entry.slug}>{entry.logoUrl ? <img src={entry.logoUrl} alt="" /> : null}<span>{entry.name}</span></Link>)}</div>
              </details>
              <Link className="athlete-portal-profile-link" href="?section=profile">
                Meu perfil
              </Link>
            </div>
            <AthletePortalNotifications arenaSlug={arena.slug} notifications={notifications} />
          </div>
        ) : null}
      </div>
    </header>
  );

  if (!currentClient)
    return (
      <main className="athlete-portal-page">
        {publicHeader}
        <section className="athlete-portal-auth">{authForm}</section>
      </main>
    );

  const portalVisibility = arena;
  const requestedSection =
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
      ? [{ label: "Ligas", href: portalHref("leagues", "games"), icon: "trophy" as const }]
      : []),
    ...(portalVisibility.athletePortalShowDoublesRadar
      ? [{ label: "Radar de duplas", href: portalHref("radar"), icon: "players" as const }]
      : []),
  ];

  return (
    <main className="athlete-portal-page">
      {publicHeader}
      <AthletePortalPrefetch hrefs={[portalHref("home"), portalHref("leagues", "games"), portalHref("lessons"), portalHref("profile"), portalHref("radar")]} />
      {requestedSection !== "home" ? <div className="athlete-portal-back"><Link href={portalHref("home")}>← Voltar ao início</Link></div> : null}
      {requestedSection === "lessons" || requestedSection === "classes" ? (
        <nav
          className="athlete-portal-league-nav athlete-portal-lessons-nav athlete-portal-learning-tabs"
          aria-label="Menu de aulas"
        >
          {portalVisibility.athletePortalShowLessons ? (
            <Link
              className={requestedSection === "lessons" ? "active" : ""}
              href={portalHref("lessons")}
            >
              <EventNavIcon icon="calendar" /><span>Minhas aulas</span>
            </Link>
          ) : null}
          {portalVisibility.athletePortalShowClasses ? (
            <Link
              className={requestedSection === "classes" ? "active" : ""}
              href={portalHref("classes")}
            >
              <EventNavIcon icon="players" /><span>Turmas</span>
            </Link>
          ) : null}
        </nav>
      ) : null}
      {requestedSection === "profile" || requestedSection === "finance" ? (
        <nav className="athlete-portal-league-nav" aria-label="Menu do meu perfil">
          <Link className={requestedSection === "profile" ? "active" : ""} href={portalHref("profile")}>Dados pessoais</Link>
          <Link className={requestedSection === "finance" ? "active" : ""} href={portalHref("finance")}>Finanças</Link>
        </nav>
      ) : null}
      {requestedSection === "home" ? (
        <ClientHomePanel home={home} name={currentClient.name} arenaSlug={arena.slug} shortcuts={homeShortcuts} />
      ) : requestedSection === "finance" ? (
        <ClientFinancePanel finance={finance} arenaSlug={arena.slug} tab={financeTab} />
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
          <section className="athlete-portal-events-shell">
          <nav className="athlete-portal-events-nav" aria-label="Menu de Eventos">
            <Link className={selectedEventTab === "leagues" ? "active" : ""} href={portalHref("leagues", "games", undefined, leagueCategoryId, "leagues")}><EventNavIcon icon="trophy" /><span><strong>Ligas</strong><small>Competições regulares</small></span></Link>
            <Link className={selectedEventTab === "super12" ? "active" : ""} href={portalHref("leagues", undefined, undefined, undefined, "super12", super12Id)}><EventNavIcon icon="crown" /><span><strong>Super 12</strong><small>Os melhores no ano</small></span></Link>
            <Link className={selectedEventTab === "radar" ? "active" : ""} href={portalHref("leagues", undefined, undefined, undefined, "radar")}><EventNavIcon icon="target" /><span><strong>Radar de Torneios</strong><small>Torneios próximos</small></span></Link>
          </nav>
          {selectedEventTab === "leagues" ? <>
          <nav className="athlete-portal-event-tabs" aria-label="Menu da Liga">
            <Link
              className={selectedLeagueTab === "games" ? "active" : ""}
              href={portalHref("leagues", "games", undefined, leagueCategoryId)}
            >
              <EventNavIcon icon="calendar" /><span>Jogos</span>
            </Link>
            <Link
              className={selectedLeagueTab === "pairs" ? "active" : ""}
              href={portalHref("leagues", "pairs", undefined, leagueCategoryId)}
            >
              <EventNavIcon icon="players" /><span>Duplas</span>
            </Link>
            <Link
              className={selectedLeagueTab === "ranking" ? "active" : ""}
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
              className={selectedLeagueTab === "rules" ? "active" : ""}
              href={portalHref("leagues", "rules", undefined, leagueCategoryId)}
            >
              <EventNavIcon icon="rules" /><span>Regras</span>
            </Link>
            <Link
              className={selectedLeagueTab === "prizes" ? "active" : ""}
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
              <section className="athlete-portal-content-panel">
                <PortalEmpty
                  title="Portal indisponível"
                  detail="Não foi possível carregar os dados do atleta neste momento."
                />
              </section>
            )
          ) : null}
          {selectedLeagueTab === "rules" && data ? <RulesPanel data={data} /> : null}
          {selectedLeagueTab === "ranking" ? (
            data ? <RankingPanel data={data} /> : null
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
        <ClassesPanel portal={portal} teacherId={teacherId} />
      ) : requestedSection === "teacher" && currentClient.isTeacher ? (
        <TeacherManagementPanel portal={portal} />
      ) : (
        <PublicPlayerProfile
          arenaSlug={arena.slug}
          player={currentClient}
        />
      )}
      <nav className="athlete-portal-bottom-nav" aria-label="Atalhos principais">
        <Link className={requestedSection === "home" ? "active" : ""} href={portalHref("home")}><PortalNavIcon icon="home" /><span>Início</span></Link>
        <Link className={requestedSection === "leagues" ? "active" : ""} href={portalHref("leagues", "games")}><PortalNavIcon icon="calendar" /><span>Eventos</span></Link>
        <Link className={requestedSection === "lessons" || requestedSection === "classes" ? "active" : ""} href={portalHref(portalVisibility.athletePortalShowLessons ? "lessons" : "classes")}><PortalNavIcon icon="graduation" /><span>Aulas</span></Link>
        <Link className={requestedSection === "radar" ? "active" : ""} href={portalHref("radar")}><PortalNavIcon icon="players" /><span>Duplas</span></Link>
      </nav>
    </main>
  );
}

function ClientFinancePanel({ finance, arenaSlug, tab }: { finance: ClientFinance; arenaSlug: string; tab: "upcoming" | "history" }) {
  if (!finance) return <section className="athlete-portal-content-panel"><PortalEmpty title="Finanças indisponíveis" detail="Não foi possível carregar suas informações financeiras agora." /></section>;
  const message = finance.health === "healthy"
    ? { title: "Tudo certo por aqui, padelista! 🎾", detail: "Quadra livre, contas em ordem e foco no próximo voleio." }
    : finance.health === "upcoming"
      ? { title: "Tudo certo por aqui, padelista! 🎾", detail: "Seus próximos pagamentos já estão na linha. Quem mantém as contas em ordem, acerta 85% mais voleios." }
      : { title: "Vamos virar esse jogo? 🎾", detail: "Tem uma pendência pedindo atenção. Resolva agora e volte para a quadra com a cabeça leve." };
  return <section className="client-finance-page">
    <header className={`client-finance-hero is-${finance.health}`}>
      <span>FINANÇAS</span>
      <div><div className="client-finance-orb" aria-hidden="true"><FinanceIcon icon="wallet" /></div><div><h2>{message.title}</h2><p>{message.detail}</p></div></div>
      <b className="client-finance-motto">DISCIPLINA<br />TAMBÉM<br />JOGA.</b>
    </header>
    <div className="client-finance-summary" aria-label="Resumo financeiro">
      <article className={finance.overdue.length ? "is-attention" : "is-healthy"}><span><FinanceIcon icon={finance.overdue.length ? "receipt" : "check"} /></span><div><b>{finance.overdue.length ? "Pendências" : "Em dia"}</b><small>{finance.overdue.length ? `${finance.overdue.length} para resolver` : "Suas finanças organizadas"}</small></div></article>
      <article><span><FinanceIcon icon="receipt" /></span><div><b>Pendências</b><strong>{finance.overdue.length}</strong></div></article>
      <article><span><FinanceIcon icon="calendar" /></span><div><b>Próximos</b><strong>{finance.open.length}</strong></div></article>
    </div>
    <nav className="client-finance-tabs" aria-label="Navegação financeira"><Link className={tab === "upcoming" ? "active" : ""} href="?section=finance">Lançamentos</Link><Link className={tab === "history" ? "active" : ""} href="?section=finance&financeTab=history">Histórico</Link></nav>
    {tab === "upcoming" ? <>
      <section className="client-finance-section"><header><div><span className="client-finance-section-icon"><FinanceIcon icon="clock" /></span><h3>Para agora</h3></div><span>{finance.overdue.length ? "Há algo pendente" : "Nenhuma pendência"}</span></header>{finance.overdue.length ? finance.overdue.map((entry) => <FinanceEntry key={entry.id} entry={entry} arenaSlug={arenaSlug} />) : <p className="client-finance-empty">Você está em dia. Obrigado por manter tudo organizado ✨</p>}</section>
      <section className="client-finance-section"><header><div><span className="client-finance-section-icon"><FinanceIcon icon="calendar" /></span><h3>Próximos pagamentos</h3></div><span>{finance.open.length}</span></header>{finance.open.length ? finance.open.map((entry) => <FinanceEntry key={entry.id} entry={entry} arenaSlug={arenaSlug} />) : <p className="client-finance-empty">Nenhum pagamento futuro aguardando você.</p>}</section>
    </> : <section className="client-finance-section"><header><div><span className="client-finance-section-icon"><FinanceIcon icon="receipt" /></span><h3>Histórico de pagamentos</h3></div><span>{finance.paid.length}</span></header>{finance.paid.length ? finance.paid.map((entry) => <article className="client-finance-entry is-paid" key={entry.id}><div><strong>{entry.description}</strong><small>Pago em {entry.paidAt || entry.dueDate}</small></div><b>{entry.amount}</b><em>Pago</em></article>) : <p className="client-finance-empty">Quando houver pagamentos, eles aparecerão aqui.</p>}</section>}
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
  return <svg className="client-finance-icon" viewBox="0 0 24 24" aria-hidden="true">{shapes[icon]}</svg>;
}

function FinanceEntry({ entry, arenaSlug }: { entry: NonNullable<ClientFinance>["open"][number]; arenaSlug: string }) {
  return <article className={`client-finance-entry is-${entry.status} is-due-${entry.urgency}`}><div><strong>{entry.description}</strong><small>{entry.status === "overdue" ? "Venceu em" : "Vence em"} {entry.dueDate}</small></div><b>{entry.amount}</b>{entry.hasCharge ? <a className="button button-primary button-small" href={`/classificacao/${arenaSlug}/cobranca/${entry.id}`}>Ver boleto</a> : <em>{entry.status === "overdue" ? "Em aberto" : "Programado"}</em>}</article>;
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
  return <svg className="portal-nav-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[icon]}</svg>;
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
  return <svg className="athlete-portal-event-icon" viewBox="0 0 24 24" aria-hidden="true">{shapes[icon]}</svg>;
}

function ClientHomePanel({ home, name, arenaSlug, shortcuts }: { home: ClientHome; name: string; arenaSlug: string; shortcuts: { label: string; href: string; icon: "calendar" | "graduation" | "trophy" | "players" }[] }) {
  if (!home) return <section className="athlete-portal-content-panel"><PortalEmpty title="Início indisponível" detail="Não foi possível carregar suas informações agora." /></section>;
  const firstName = name.trim().split(/\s+/)[0] || name;
  return <section className="client-portal-home"><header className="client-portal-welcome"><span>OLÁ,</span><h2>{firstName}</h2></header><nav className="client-portal-shortcuts" aria-label="Atalhos do portal">{shortcuts.map((shortcut) => <Link href={shortcut.href} key={shortcut.label} className={`is-${shortcut.icon}`}><PortalNavIcon icon={shortcut.icon} /><span>{shortcut.label}</span><b aria-hidden="true">›</b></Link>)}</nav><div className="client-portal-home-grid"><section className="client-portal-announcements"><header><div className="client-portal-section-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5h4.2L16 5v14l-8.8-5.5H3v-3ZM7.2 10.5v3M7.2 13.5l1.7 5" /><path d="M19 9.5c1 .8 1.6 1.7 1.6 2.5s-.6 1.7-1.6 2.5" /></svg></div><div><h3>Avisos da Arena</h3><small>Portal do atleta</small></div><b aria-hidden="true">›</b></header>{home.announcements.length ? home.announcements.map((announcement) => <article key={announcement.id}><strong>{announcement.title}</strong><p><PortalRichText text={announcement.message} /></p></article>) : <p className="muted">A arena ainda não divulgou avisos.</p>}</section><section className="client-portal-summary"><header><h3>Resumo da sua situação</h3><Link href="?section=finance">Ver detalhes <b>›</b></Link></header><div><Link className="client-portal-summary-link is-finance" href="?section=finance"><PortalNavIcon icon="money" /><span>Financeiro</span><strong className={home.summary.financialStatus === "overdue" ? "is-overdue" : home.summary.financialStatus === "pending" ? "is-pending" : "is-active"}>{home.summary.financial}</strong>{home.summary.futureFinancial ? <small className="client-portal-future-financial">{home.summary.futureFinancial}</small> : null}</Link><Link className="client-portal-summary-link is-lessons" href="?section=lessons"><PortalNavIcon icon="graduation" /><span>Aulas</span><strong>{home.summary.classes} disponíveis</strong></Link><Link className="client-portal-summary-link is-reservations" href="?section=reservations"><PortalNavIcon icon="calendar" /><span>Reservas</span><strong>{home.summary.reservations} próxima{home.summary.reservations === 1 ? "" : "s"}</strong></Link><Link className="client-portal-summary-link is-leagues" href="?section=leagues"><PortalNavIcon icon="trophy" /><span>Ligas</span><strong>{home.summary.leagues} ativa{home.summary.leagues === 1 ? "" : "s"}</strong></Link></div></section></div>{home.charges.length ? <section className="client-portal-events"><header><div><span>PAGAMENTOS</span><h3>Boletos disponíveis</h3></div></header>{home.charges.map((charge) => <article className="portal-payment-charge" key={charge.id}><div><strong>{charge.description}</strong><small>{charge.amount} · vence em {charge.dueDate}</small></div><a className="button button-primary button-small" href={`/classificacao/${arenaSlug}/cobranca/${charge.id}`}>Abrir boleto</a></article>)}</section> : null}<section className="client-portal-events"><header><div><span>EVENTOS DA ARENA</span><h3>Próximos eventos</h3></div><Link href="/portal/eventos">Ver todos <b>›</b></Link></header>{home.eventPosts.length ? <ClientPortalEventCarousel events={home.eventPosts} /> : <p className="muted">Nenhum evento próximo. Fique de olho: a arena pode abrir novas partidas em breve.</p>}</section></section>;
}

function PrizePanel({ portal }: { portal: Portal }) {
  return (
    <section className="portal-league-prize-podium">
      <div className="portal-league-prize-cup" aria-hidden="true">
        🏆
      </div>
      <div className="portal-league-prize-copy">
        <span>PREMIAÇÃO DA LIGA</span>
        <h2>O pódio está à sua espera</h2>
        <p>Acompanhe a premiação das suas Ligas em tempo real.</p>
      </div>
      <div className="portal-league-prize-list">
        {portal?.prizes.length ? (
          portal.prizes.map((prize) => (
            <article key={prize.id}>
              <strong>{prize.categoryName}</strong>
              <span>{prize.eventName}</span>
              <b className="portal-league-prize-description">
                {prize.description}
              </b>
            </article>
          ))
        ) : (
          <p>A arena ainda não divulgou a premiação das suas Ligas.</p>
        )}
      </div>
    </section>
  );
}

function RulesPanel({ data }: { data: ArenaPublicStandings }) {
  return (
    <section className="athlete-portal-content-panel">
      <header>
        <span>REGULAMENTO</span>
        <h2>Regras das Ligas</h2>
      </header>
      {data.leagueRules.length ? (
        data.leagueRules.map((league) => (
          <article className="portal-rule" key={league.id}>
            <strong>{league.categoryName}</strong>
            <p>{league.rules}</p>
          </article>
        ))
      ) : (
        <p className="muted">
          Nenhuma regra foi publicada para as Ligas ativas.
        </p>
      )}
    </section>
  );
}

function RankingPanel({ data }: { data: ArenaPublicStandings }) {
  return (
    <section className="athlete-portal-content-panel stack-md portal-ranking-panel">
      <header className="portal-ranking-heading">
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V11M12 20V4M19 20v-7" /><path d="M3 20h18" /></svg>CLASSIFICAÇÃO</span>
        <h2>Ranking da Liga</h2>
      </header>
      {data.options.length ? (
        <form method="get" className="portal-compact-filter">
          <input type="hidden" name="section" value="leagues" />
          <input type="hidden" name="leagueTab" value="ranking" />
          <input type="hidden" name="tab" value="ranking" />
          <label><span>Categoria</span><select name="view" defaultValue={data.selectedOptionId ?? undefined}>
            {data.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select></label>
          <button className="button button-primary" type="submit">
            Consultar
          </button>
        </form>
      ) : null}
      {data.selected?.kind === "GENERAL_RANKING" ? (
        <table className="portal-ranking-table">
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
        <table className="portal-ranking-table">
          <thead>
            <tr>
              <th>Pos.</th>
              <th>Dupla</th>
              <th>Jogos</th>
              <th>Vitórias</th>
              <th>Derrotas</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {data.selected.leagueStandings.map((standing) => (
              <tr key={standing.position}>
                <td>{standing.position}</td>
                <td>{standing.pairName}</td>
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
        <p className="muted">Nenhuma classificação publicada neste momento.</p>
      ) : null}
    </section>
  );
}

function ReservationsPanel({ portal }: { portal: Portal }) {
  return (
    <section className="athlete-portal-content-panel">
      <header>
        <span>MINHAS RESERVAS</span>
        <h2>Próximos horários</h2>
      </header>
      {portal?.reservations.length ? (
        <div className="portal-activity-list">
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
    <section className="athlete-portal-content-panel athlete-portal-learning-panel is-lessons">
      <header className="athlete-portal-learning-heading">
        <span>AULAS</span>
        <h2>Suas próximas aulas</h2>
        <p>Acompanhe aqui as aulas que você já agendou.</p>
      </header>
      {portal?.lessons.length ? (
        <div className="portal-activity-list">
          {portal.lessons.map((lesson) => (
            <article key={lesson.id}>
              <div>
                <strong>{lesson.title}</strong>
                <span>
                  {lesson.teacherName ? `${lesson.teacherName} · ` : ""}
                  {lesson.when}
                </span>
              </div>
              <b>{lesson.status}</b>
            </article>
          ))}
        </div>
      ) : (
        <div className="portal-learning-empty"><EventNavIcon icon="calendar" /><PortalEmpty title="Nenhuma aula programada" detail="Quando uma aula for agendada, ela aparecerá neste painel." /><b>EVOLUÇÃO TAMBÉM SE CONSTRÓI<br />COM PLANEJAMENTO</b></div>
      )}
    </section>
  );
}

function ClassesPanel({
  portal,
  teacherId,
}: {
  portal: Portal;
  teacherId?: string;
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
    <section className="athlete-portal-content-panel athlete-portal-learning-panel is-classes">
      <header className="athlete-portal-learning-heading">
        <span>TURMAS</span>
        <h2>Encontre sua turma</h2>
        <p>Escolha um professor para ver as turmas disponíveis.</p>
        <EventNavIcon icon="players" />
      </header>
      <div className="portal-teacher-picker">
        <strong>Professores</strong>
        {teachers.length ? (
          <div>
            {teachers.map((teacher) => (
              <Link
                className={selectedTeacher?.id === teacher.id ? "active" : ""}
                href={portalHref("classes", undefined, teacher.id)}
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
        <section className="portal-selected-teacher-section">
          <strong className="portal-selected-teacher">
            Turmas de {selectedTeacher.name}
          </strong>
          <div className="portal-class-group-list portal-selected-teacher-groups">
            {selectedClassGroups.length ? (
              selectedClassGroups.map((group) => (
                <article
                  key={group.id}
                  className={
                    group.available
                      ? "portal-class-group-available"
                      : "portal-class-group-full"
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
                        className="button button-primary button-small"
                      />
                    </SafeActionForm>
                  ) : (
                    <b>Sem vagas</b>
                  )}
                </article>
              ))
            ) : (
              <p className="muted">
                Este professor não possui turmas disponíveis no momento.
              </p>
            )}
          </div>
        </section>
      ) : (
        <p className="portal-teacher-hint">
          Escolha um professor para ver as turmas disponíveis.
        </p>
      )}
    </section>
  );
}

function TeacherManagementPanel({ portal }: { portal: Portal }) {
  const management = portal?.teacherManagement;
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return (
    <section className="athlete-portal-content-panel teacher-portal-management">
      <header>
        <span>GESTÃO DO PROFESSOR</span>
        <h2>Planos, alunos, turmas e agenda</h2>
      </header>
      {management ? (
        <div className="teacher-portal-management-grid">
          <article>
            <h3>Planos</h3>
            {management.plans.length ? (
              management.plans.map((plan) => (
                <div key={plan.id}>
                  <strong>{plan.name}</strong>
                  <span>
                    {plan.classesPerMonth} aulas/mês ·{" "}
                    {(plan.monthlyPriceCents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
              ))
            ) : (
              <p>Nenhum plano vinculado.</p>
            )}
          </article>
          <article>
            <h3>Alunos ativos</h3>
            {management.students.length ? (
              management.students.map((student) => (
                <div key={student.id}>
                  <strong>{student.name}</strong>
                  <span>
                    {student.planName} · saldo: {student.remainingClasses}{" "}
                    aula(s)
                  </span>
                </div>
              ))
            ) : (
              <p>Nenhum aluno ativo.</p>
            )}
          </article>
          <article>
            <h3>Minhas turmas</h3>
            {management.classGroups.length ? (
              management.classGroups.map((group) => (
                <div key={group.id}>
                  <strong>{group.name}</strong>
                  <span>
                    {group.schedules
                      .map(
                        (schedule) =>
                          `${weekdays[schedule.weekday]} ${schedule.startTime}: ${group.enrolledCount}/${schedule.capacity} vagas`,
                      )
                      .join(" · ")}
                  </span>
                  {group.students.map((student) => (
                    <div className="teacher-class-student" key={student.id}>
                      <b>{student.name}</b>
                      <SafeActionForm action={moveClassGroupStudentAction}>
                        <input
                          type="hidden"
                          name="arenaSlug"
                          value={portal?.arenaSlug}
                        />
                        <input
                          type="hidden"
                          name="sourceClassGroupId"
                          value={group.id}
                        />
                        <input
                          type="hidden"
                          name="studentId"
                          value={student.id}
                        />
                        <select name="destinationClassGroupId" defaultValue="">
                          <option value="" disabled>
                            Mover aluno
                          </option>
                          {management.classGroups
                            .filter((target) => target.id !== group.id)
                            .map((target) => (
                              <option value={target.id} key={target.id}>
                                {target.name}
                              </option>
                            ))}
                        </select>
                        <SubmitButton
                          label="Mover aluno"
                          pendingLabel="Movendo..."
                          className="button button-small"
                        />
                      </SafeActionForm>
                      <SafeActionForm action={registerClassGroupMakeupAction}>
                        <input
                          type="hidden"
                          name="arenaSlug"
                          value={portal?.arenaSlug}
                        />
                        <input
                          type="hidden"
                          name="sourceClassGroupId"
                          value={group.id}
                        />
                        <input
                          type="hidden"
                          name="studentId"
                          value={student.id}
                        />
                        <select name="destinationClassGroupId" defaultValue="">
                          <option value="" disabled>
                            Turma da reposição
                          </option>
                          {management.classGroups
                            .filter((target) => target.id !== group.id)
                            .map((target) => (
                              <option value={target.id} key={target.id}>
                                {target.name}
                              </option>
                            ))}
                        </select>
                        <input name="scheduledFor" type="date" required />
                        <SubmitButton
                          label="Registrar reposição"
                          pendingLabel="Salvando..."
                          className="button button-small"
                        />
                      </SafeActionForm>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p>Nenhuma turma vinculada.</p>
            )}
          </article>
          <article>
            <h3>Agenda</h3>
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
    <div className="portal-empty">
      <strong>{title}</strong>
      <span>{detail}</span>
      {action && href ? (
        <Link className="button button-primary" href={href}>
          {action}
        </Link>
      ) : null}
    </div>
  );
}
