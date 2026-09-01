import Link from "next/link";
import { PublicBookingContent } from "@/components/public-booking-content";
import type { ArenaPublicStandings } from "@/lib/services/public-standings";
import { PublicLeaguePortal } from "@/components/tournaments/public-league-portal";
import { PublicPlayerProfile } from "@/components/public-player-profile";

type Portal = Awaited<ReturnType<typeof import("@/lib/services/public-league-portal").getPublicLeaguePortal>>;
type PortalSection = "leagues" | "booking" | "reservations" | "lessons" | "classes" | "profile" | "teacher";
type LeagueTab = "games" | "ranking" | "rules" | "prizes";

function portalHref(section: PortalSection, leagueTab?: LeagueTab, teacherId?: string) {
  const query = new URLSearchParams({ section, tab: leagueTab === "ranking" ? "ranking" : leagueTab === "rules" ? "rules" : leagueTab === "prizes" ? "portal" : "games" });
  if (leagueTab) query.set("leagueTab", leagueTab);
  if (teacherId) query.set("teacher", teacherId);
  return `?${query.toString()}`;
}

export function PublicStandings({
  data,
  currentClient,
  portal,
  authForm,
  section = "leagues",
  leagueTab = "games",
  bookingDate,
  teacherId,
}: {
  data: ArenaPublicStandings;
  currentClient: { name: string; phone: string; email: string; photoUrl: string; birthDate: string; isTeacher: boolean } | null;
  portal: Portal;
  authForm: React.ReactNode;
  section?: PortalSection;
  leagueTab?: LeagueTab;
  bookingDate?: string;
  teacherId?: string;
}) {
  const publicHeader = (
    <header className="athlete-portal-hero">
      <div className="athlete-portal-hero-inner">
        <div className="athlete-portal-brand">
          {data.arena.logoUrl ? <img src={data.arena.logoUrl} alt={`Logo da arena ${data.arena.name}`} /> : <span className="athlete-portal-mark">AP</span>}
          <div><span>ARENA PADEL</span><h1>Portal do Atleta</h1><p>Acompanhe suas atividades, reservas e Ligas em um só lugar.</p></div>
        </div>
        {currentClient ? <strong className="athlete-portal-greeting">Olá, {currentClient.name}</strong> : null}
      </div>
    </header>
  );

  if (!currentClient) return <main className="athlete-portal-page">{publicHeader}<section className="athlete-portal-auth">{authForm}</section></main>;

  const selectedLeagueTab: LeagueTab = leagueTab === "ranking" || leagueTab === "rules" || leagueTab === "prizes" ? leagueTab : "games";

  return <main className="athlete-portal-page">
    {publicHeader}
    <nav className="athlete-portal-main-nav" aria-label="Menu do portal do atleta">
      <Link className={section === "leagues" ? "active" : ""} href={portalHref("leagues", "games")}>Ligas</Link>
      <Link className={section === "booking" ? "active" : ""} href={portalHref("booking")}>Grade de horários</Link>
      <Link className={section === "reservations" ? "active" : ""} href={portalHref("reservations")}>Minhas reservas</Link>
      <Link className={section === "lessons" ? "active" : ""} href={portalHref("lessons")}>Aulas</Link>
      <Link className={section === "classes" ? "active" : ""} href={portalHref("classes")}>Turmas</Link>
      {currentClient.isTeacher ? <Link className={section === "teacher" ? "active" : ""} href={portalHref("teacher")}>Gestão</Link> : null}
      <Link className={section === "profile" ? "active" : ""} href={portalHref("profile")}>Meu perfil</Link>
    </nav>
    {section === "leagues" ? <>
      <nav className="athlete-portal-league-nav" aria-label="Menu da Liga">
        <Link className={selectedLeagueTab === "games" ? "active" : ""} href={portalHref("leagues", "games")}>Jogos</Link>
        <Link className={selectedLeagueTab === "ranking" ? "active" : ""} href={portalHref("leagues", "ranking")}>Ranking</Link>
        <Link className={selectedLeagueTab === "rules" ? "active" : ""} href={portalHref("leagues", "rules")}>Regras</Link>
        <Link className={selectedLeagueTab === "prizes" ? "active" : ""} href={portalHref("leagues", "prizes")}>Premiação</Link>
      </nav>
      {selectedLeagueTab === "games" ? (portal ? <PublicLeaguePortal arenaSlug={data.arena.slug} playerName={currentClient.name} portal={portal} showPrize={false} /> : <section className="athlete-portal-content-panel"><PortalEmpty title="Portal indisponível" detail="Não foi possível carregar os dados do atleta neste momento." /></section>) : null}
      {selectedLeagueTab === "rules" ? <RulesPanel data={data} /> : null}
      {selectedLeagueTab === "ranking" ? <RankingPanel data={data} /> : null}
      {selectedLeagueTab === "prizes" ? <PrizePanel portal={portal} /> : null}
    </> : section === "booking" ? <PublicBookingContent arenaSlug={data.arena.slug} date={bookingDate} embedded /> : section === "reservations" ? <ReservationsPanel portal={portal} /> : section === "lessons" ? <LessonsPanel portal={portal} /> : section === "classes" ? <ClassesPanel portal={portal} teacherId={teacherId} /> : section === "teacher" && currentClient.isTeacher ? <TeacherManagementPanel portal={portal} /> : <PublicPlayerProfile arenaSlug={data.arena.slug} player={currentClient} />}
  </main>;
}

function PrizePanel({ portal }: { portal: Portal }) {
  return <section className="portal-league-prize-podium"><div className="portal-league-prize-cup" aria-hidden="true">🏆</div><div className="portal-league-prize-copy"><span>PREMIAÇÃO DA LIGA</span><h2>O pódio está à sua espera</h2><p>Acompanhe a premiação das suas Ligas em tempo real.</p></div><div className="portal-league-prize-list">{portal?.prizes.length ? portal.prizes.map((prize) => <article key={prize.id}><strong>{prize.categoryName}</strong><span>{prize.eventName}</span><b className="portal-league-prize-description">{prize.description}</b></article>) : <p>A arena ainda não divulgou a premiação das suas Ligas.</p>}</div></section>;
}

function RulesPanel({ data }: { data: ArenaPublicStandings }) {
  return <section className="athlete-portal-content-panel"><header><span>REGULAMENTO</span><h2>Regras das Ligas</h2></header>{data.leagueRules.length ? data.leagueRules.map((league) => <article className="portal-rule" key={league.id}><strong>{league.eventName} · {league.categoryName}</strong><p>{league.rules}</p></article>) : <p className="muted">Nenhuma regra foi publicada para as Ligas ativas.</p>}</section>;
}

function RankingPanel({ data }: { data: ArenaPublicStandings }) {
  return <section className="athlete-portal-content-panel stack-md"><header><span>CLASSIFICAÇÃO</span><h2>Ranking da Liga</h2></header>{data.options.length ? <form method="get" className="portal-compact-filter"><input type="hidden" name="section" value="leagues" /><input type="hidden" name="leagueTab" value="ranking" /><input type="hidden" name="tab" value="ranking" /><select name="view" defaultValue={data.selectedOptionId ?? undefined}>{data.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><button className="button button-primary" type="submit">Consultar</button></form> : null}{data.selected?.kind === "GENERAL_RANKING" ? <table className="portal-ranking-table"><thead><tr><th>Pos.</th><th>Atleta</th><th>Pontos</th><th>Eventos</th></tr></thead><tbody>{data.selected.rows.map((row) => <tr key={`${row.position}-${row.playerName}`}><td>{row.position}</td><td>{row.playerName}</td><td>{row.points}</td><td>{row.tournamentsPlayed}</td></tr>)}</tbody></table> : null}{data.selected?.kind === "CATEGORY" && data.selected.format === "LEAGUE" ? <table className="portal-ranking-table"><thead><tr><th>Pos.</th><th>Dupla</th><th>Jogos</th><th>Vitórias</th><th>Derrotas</th><th>Saldo</th></tr></thead><tbody>{data.selected.leagueStandings.map((standing) => <tr key={standing.position}><td>{standing.position}</td><td>{standing.pairName}</td><td>{standing.matches}</td><td>{standing.victories}</td><td>{standing.losses}</td><td>{standing.differential}</td></tr>)}</tbody></table> : null}{!data.selected ? <p className="muted">Nenhuma classificação publicada neste momento.</p> : null}</section>;
}

function ReservationsPanel({ portal }: { portal: Portal }) {
  return <section className="athlete-portal-content-panel"><header><span>MINHAS RESERVAS</span><h2>Próximos horários</h2></header>{portal?.reservations.length ? <div className="portal-activity-list">{portal.reservations.map((reservation) => <article key={reservation.id}><div><strong>{reservation.title}</strong><span>{reservation.courtName} · {reservation.when}</span></div><b>{reservation.status}</b></article>)}</div> : <PortalEmpty title="Nenhuma reserva futura" detail="Suas próximas reservas aparecerão aqui." action="Reservar horário" href={`/reservar/${portal?.arenaSlug ?? ""}`} />}</section>;
}

function LessonsPanel({ portal }: { portal: Portal }) {
  return <section className="athlete-portal-content-panel"><header><span>AULAS</span><h2>Suas próximas aulas</h2></header>{portal?.lessons.length ? <div className="portal-activity-list">{portal.lessons.map((lesson) => <article key={lesson.id}><div><strong>{lesson.title}</strong><span>{lesson.teacherName ? `${lesson.teacherName} · ` : ""}{lesson.when}</span></div><b>{lesson.status}</b></article>)}</div> : <PortalEmpty title="Nenhuma aula programada" detail="Quando uma aula for agendada, ela aparecerá neste painel." />}</section>;
}

function ClassesPanel({ portal, teacherId }: { portal: Portal; teacherId?: string }) {
  const teachers = portal?.teachers ?? [];
  const selectedTeacher = teachers.find((teacher) => teacher.id === teacherId);
  const classes = selectedTeacher ? (portal?.classes ?? []).filter((item) => item.teacherId === selectedTeacher.id) : [];
  return <section className="athlete-portal-content-panel"><header><span>TURMAS</span><h2>Turmas disponíveis</h2></header><div className="portal-teacher-picker"><strong>Selecionar professor</strong>{teachers.length ? <div>{teachers.map((teacher) => <Link className={selectedTeacher?.id === teacher.id ? "active" : ""} href={portalHref("classes", undefined, teacher.id)} key={teacher.id}>{teacher.name}</Link>)}</div> : <span>Nenhum professor ativo cadastrado.</span>}</div>{selectedTeacher ? <div className="portal-activity-list"><strong className="portal-selected-teacher">Turmas de {selectedTeacher.name}</strong>{classes.length ? classes.map((item) => <article key={item.id}><div><strong>{item.title}</strong><span>{item.when}</span></div><b>{item.status}</b></article>) : <p className="muted">Não há turmas futuras agendadas para este professor.</p>}</div> : <p className="portal-teacher-hint">Selecione um professor para ver os dias e horários das turmas.</p>}</section>;
}

function TeacherManagementPanel({ portal }: { portal: Portal }) {
  const management = portal?.teacherManagement;
  return <section className="athlete-portal-content-panel teacher-portal-management"><header><span>GESTÃO DO PROFESSOR</span><h2>Planos, alunos, turmas e agenda</h2></header>{management ? <div className="teacher-portal-management-grid"><article><h3>Planos</h3>{management.plans.length ? management.plans.map((plan) => <div key={plan.id}><strong>{plan.name}</strong><span>{plan.classesPerMonth} aulas/mês · {(plan.monthlyPriceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div>) : <p>Nenhum plano vinculado.</p>}</article><article><h3>Alunos ativos</h3>{management.students.length ? management.students.map((student) => <div key={student.id}><strong>{student.name}</strong><span>{student.planName} · saldo: {student.remainingClasses} aula(s)</span></div>) : <p>Nenhum aluno ativo.</p>}</article><article><h3>Turmas e agenda</h3>{management.agenda.length ? management.agenda.map((item) => <div key={item.id}><strong>{item.title}</strong><span>{item.when} · {item.status}</span></div>) : <p>Nenhuma atividade futura.</p>}</article></div> : <PortalEmpty title="Perfil de professor indisponível" detail="Peça à arena para ativar o seu cadastro de professor." />}</section>;
}

function PortalEmpty({ title, detail, action, href }: { title: string; detail: string; action?: string; href?: string }) {
  return <div className="portal-empty"><strong>{title}</strong><span>{detail}</span>{action && href ? <Link className="button button-primary" href={href}>{action}</Link> : null}</div>;
}
