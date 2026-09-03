import Link from "next/link";
import { PublicBookingContent } from "@/components/public-booking-content";
import type { ArenaPublicStandings } from "@/lib/services/public-standings";
import { PublicLeaguePortal } from "@/components/tournaments/public-league-portal";
import { PublicPlayerProfile } from "@/components/public-player-profile";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { PlayerAvatar } from "@/components/player-avatar";
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
type PortalSection =
  | "leagues"
  | "booking"
  | "reservations"
  | "lessons"
  | "classes"
  | "profile"
  | "teacher";
type LeagueTab = "games" | "pairs" | "ranking" | "rules" | "prizes";

function portalHref(
  section: PortalSection,
  leagueTab?: LeagueTab,
  teacherId?: string,
  leagueCategoryId?: string,
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
  if (teacherId) query.set("teacher", teacherId);
  if (leagueCategoryId) query.set("leagueCategory", leagueCategoryId);
  return `?${query.toString()}`;
}

export function PublicStandings({
  data,
  currentClient,
  portal,
  authForm,
  section = "leagues",
  leagueTab = "games",
  leagueCategoryId,
  bookingDate,
  teacherId,
}: {
  data: ArenaPublicStandings;
  currentClient: {
    name: string;
    phone: string;
    email: string;
    photoUrl: string;
    birthDate: string;
    isTeacher: boolean;
  } | null;
  portal: Portal;
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
          <div>
            {data.arena.logoUrl ? (
              <img
                className="athlete-portal-arena-logo"
                src={data.arena.logoUrl}
                alt={`Logo da arena ${data.arena.name}`}
              />
            ) : (
              <span className="athlete-portal-arena-name">
                {data.arena.name}
              </span>
            )}
            <h1>Portal do Atleta</h1>
            <p>Acompanhe suas atividades, reservas e Ligas em um só lugar.</p>
          </div>
        </div>
        {currentClient ? (
          <div className="athlete-portal-user">
            <PlayerAvatar
              className="athlete-portal-user-avatar"
              photoUrl={currentClient.photoUrl}
              name={currentClient.name}
            />
            <strong className="athlete-portal-greeting">
              Olá, {currentClient.name}
            </strong>
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

  const portalVisibility = data.arena;
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
              : section;
  const selectedLeagueTab: LeagueTab =
    leagueTab === "pairs" ||
    leagueTab === "ranking" ||
    leagueTab === "rules" ||
    leagueTab === "prizes"
      ? leagueTab
      : "games";

  return (
    <main className="athlete-portal-page">
      {publicHeader}
      <nav
        className="athlete-portal-main-nav"
        aria-label="Menu do portal do atleta"
      >
        {portalVisibility.athletePortalShowLeagues ? (
          <Link
            className={requestedSection === "leagues" ? "active" : ""}
            href={portalHref("leagues", "games")}
          >
            Ligas
          </Link>
        ) : null}
        {portalVisibility.athletePortalShowBooking ? (
          <Link
            className={requestedSection === "booking" ? "active" : ""}
            href={portalHref("booking")}
          >
            Grade de horários
          </Link>
        ) : null}
        {portalVisibility.athletePortalShowReservations ? (
          <Link
            className={requestedSection === "reservations" ? "active" : ""}
            href={portalHref("reservations")}
          >
            Minhas reservas
          </Link>
        ) : null}
        {portalVisibility.athletePortalShowLessons ||
        portalVisibility.athletePortalShowClasses ? (
          <Link
            className={
              requestedSection === "lessons" || requestedSection === "classes"
                ? "active"
                : ""
            }
            href={portalHref(
              portalVisibility.athletePortalShowLessons ? "lessons" : "classes",
            )}
          >
            Aulas
          </Link>
        ) : null}
        {currentClient.isTeacher ? (
          <Link
            className={requestedSection === "teacher" ? "active" : ""}
            href={portalHref("teacher")}
          >
            Gestão
          </Link>
        ) : null}
        <Link
          className={requestedSection === "profile" ? "active" : ""}
          href={portalHref("profile")}
        >
          Meu perfil
        </Link>
      </nav>
      {requestedSection === "lessons" || requestedSection === "classes" ? (
        <nav
          className="athlete-portal-league-nav athlete-portal-lessons-nav"
          aria-label="Menu de aulas"
        >
          {portalVisibility.athletePortalShowLessons ? (
            <Link
              className={requestedSection === "lessons" ? "active" : ""}
              href={portalHref("lessons")}
            >
              Minhas aulas
            </Link>
          ) : null}
          {portalVisibility.athletePortalShowClasses ? (
            <Link
              className={requestedSection === "classes" ? "active" : ""}
              href={portalHref("classes")}
            >
              Turmas
            </Link>
          ) : null}
        </nav>
      ) : null}
      {requestedSection === "leagues" ? (
        <>
          <nav className="athlete-portal-league-nav" aria-label="Menu da Liga">
            <Link
              className={selectedLeagueTab === "games" ? "active" : ""}
              href={portalHref("leagues", "games", undefined, leagueCategoryId)}
            >
              Jogos
            </Link>
            <Link
              className={selectedLeagueTab === "pairs" ? "active" : ""}
              href={portalHref("leagues", "pairs", undefined, leagueCategoryId)}
            >
              Duplas
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
              Ranking
            </Link>
            <Link
              className={selectedLeagueTab === "rules" ? "active" : ""}
              href={portalHref("leagues", "rules", undefined, leagueCategoryId)}
            >
              Regras
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
              Premiação
            </Link>
          </nav>
          {selectedLeagueTab === "games" || selectedLeagueTab === "pairs" ? (
            portal ? (
              <PublicLeaguePortal
                arenaSlug={data.arena.slug}
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
          {selectedLeagueTab === "rules" ? <RulesPanel data={data} /> : null}
          {selectedLeagueTab === "ranking" ? (
            <RankingPanel data={data} />
          ) : null}
          {selectedLeagueTab === "prizes" ? (
            <PrizePanel portal={portal} />
          ) : null}
        </>
      ) : requestedSection === "booking" ? (
        <PublicBookingContent
          arenaSlug={data.arena.slug}
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
          arenaSlug={data.arena.slug}
          player={currentClient}
        />
      )}
    </main>
  );
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
    <section className="athlete-portal-content-panel stack-md">
      <header>
        <span>CLASSIFICAÇÃO</span>
        <h2>Ranking da Liga</h2>
      </header>
      {data.options.length ? (
        <form method="get" className="portal-compact-filter">
          <input type="hidden" name="section" value="leagues" />
          <input type="hidden" name="leagueTab" value="ranking" />
          <input type="hidden" name="tab" value="ranking" />
          <select name="view" defaultValue={data.selectedOptionId ?? undefined}>
            {data.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
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
    <section className="athlete-portal-content-panel">
      <header>
        <span>AULAS</span>
        <h2>Suas próximas aulas</h2>
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
        <PortalEmpty
          title="Nenhuma aula programada"
          detail="Quando uma aula for agendada, ela aparecerá neste painel."
        />
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
    <section className="athlete-portal-content-panel">
      <header>
        <span>TURMAS</span>
        <h2>Encontre sua turma</h2>
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
