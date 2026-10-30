import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { WorkspaceHeading } from "@/components/ui/workspace-heading";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/section-card";
import { requireArenaAccess } from "@/lib/auth/session";
import { canPerformPermission, canViewModule } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { viewStyles } from "../jogos/page.utilities";

type GamesPageProps = { searchParams?: Promise<{ tournamentId?: string; status?: string }> };

function setScores(match: { homeSet1: number | null; awaySet1: number | null; homeSet2: number | null; awaySet2: number | null; homeSet3: number | null; awaySet3: number | null }) {
  return [[match.homeSet1, match.awaySet1], [match.homeSet2, match.awaySet2], [match.homeSet3, match.awaySet3]]
    .filter(([home, away]) => home !== null && away !== null)
    .map(([home, away]) => `${home}–${away}`).join(" · ");
}

export default async function GamesPage(props: GamesPageProps) {
  const searchParams = await props.searchParams;
  const eventDirectoryPath = searchParams?.status === "finished" ? "/torneios?status=finished" : "/torneios";
  const auth = await requireArenaAccess();
  const canViewTournaments = canViewModule("tournaments", auth.arenaRole, auth.systemRole, auth.viewPermissions);
  const canManageTournaments = canViewTournaments && canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions);
  const canRecordResults = canViewTournaments && canPerformPermission("tournaments:results", auth.arenaRole, auth.systemRole, auth.editPermissions);
  const canReadMatches = canViewModule("matches", auth.arenaRole, auth.systemRole, auth.viewPermissions);
  if (!canViewTournaments && !canReadMatches) notFound();

  const activeTournaments = await prisma.tournament.findMany({
    where: { arenaId: auth.arenaId, registrationPhase: searchParams?.status === "finished" ? "FINISHED" : { not: "FINISHED" } },
    orderBy: { updatedAt: "desc" },
    include: { categories: { where: { active: true }, orderBy: { level: "asc" }, select: { id: true, name: true, competition: { select: { status: true } } } } }
  });
  const selectedTournament = activeTournaments.find((event) => event.id === searchParams?.tournamentId);
  const matches = selectedTournament && !canManageTournaments && !canRecordResults ? await prisma.categoryMatch.findMany({
    where: { competition: { category: { tournamentId: selectedTournament.id, active: true, tournament: { arenaId: auth.arenaId } } } },
    select: {
      id: true, label: true, scheduledDate: true, scheduledTime: true, courtName: true,
      homeScore: true, awayScore: true, homeSet1: true, awaySet1: true, homeSet2: true, awaySet2: true, homeSet3: true, awaySet3: true,
      competition: { select: { category: { select: { name: true } } } },
      homePair: { select: { name: true } }, awayPair: { select: { name: true } }
    },
    orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }, { roundOrder: "asc" }]
  }) : [];

  return <div className={viewStyles.stack_md}>
    <WorkspaceHeading eyebrow="COMPETIÇÕES · EM ANDAMENTO" title="Torneios">{canManageTournaments ? <Link href="/torneios/novo" className={ui.primary}>Novo evento</Link> : null}</WorkspaceHeading>
    <nav className="tw:flex tw:flex-wrap tw:gap-1 tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-white tw:p-1" aria-label="Situação dos eventos"><Link href="/torneios" aria-current={searchParams?.status !== "finished" ? "page" : undefined} className={`${ui.secondary} tw:aria-[current=page]:bg-[#174983] tw:aria-[current=page]:text-white`}>Eventos ativos</Link><Link href="/torneios?status=finished" aria-current={searchParams?.status === "finished" ? "page" : undefined} className={`${ui.secondary} tw:aria-[current=page]:bg-[#174983] tw:aria-[current=page]:text-white`}>Finalizados</Link>{canViewTournaments ? <Link href="/torneios/rankings" className={ui.secondary}>Rankings</Link> : null}</nav>
    {selectedTournament ? <SectionCard title={selectedTournament.name} description={canManageTournaments || canRecordResults ? "Escolha uma categoria para acessar os jogos." : undefined}>
      <div className={viewStyles.active_event_back}>
        <Link href={eventDirectoryPath} className={ui.secondary}>Voltar aos eventos</Link>
        {canManageTournaments ? <Link href={`/torneios/${selectedTournament.id}`} className={ui.secondary}>Gerenciar evento</Link> : null}
      </div>
      {canManageTournaments || canRecordResults ? <>
        <h3 className="tw:sr-only">Categorias</h3>
        {selectedTournament.categories.length ? <div className={ui.list}>{selectedTournament.categories.map((category) =>
          <article className={`${ui.row} tw:grid-cols-[minmax(0,1fr)_auto] tw:[&_span]:block tw:[&_span]:text-xs tw:[&_span]:text-[var(--muted)]`} key={category.id}><div><strong>{category.name}</strong><span>{category.competition?.status === "FINISHED" ? "Concluída" : "Em operação"}</span></div><Link href={`/torneios/${selectedTournament.id}/categorias/${category.id}${canManageTournaments ? "" : "?tab=games"}`} className={ui.secondary}>{canManageTournaments ? "Abrir categoria" : "Lançar resultados"}</Link></article>
        )}</div> : <p className={viewStyles.muted}>Este evento ainda não possui categorias ativas.</p>}
      </> : <>
        <h3 className="tw:m-0 tw:text-base tw:font-semibold tw:text-[#132d58]">Programação e placares</h3>
        {matches.length ? <div className="tw:grid tw:gap-3">{matches.map((match) => {
          const score = match.homeScore !== null && match.awayScore !== null ? `${match.homeScore} × ${match.awayScore}` : "Aguardando";
          const games = setScores(match);
          return <article key={match.id} className="tw:min-w-0 tw:rounded-xl tw:border tw:border-[#dce7f2] tw:bg-white tw:p-4">
            <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:text-xs tw:text-[#607898]"><span>{match.competition.category.name} · {match.label}</span><span>{[match.scheduledDate, match.scheduledTime, match.courtName].filter(Boolean).join(" · ") || "Horário a definir"}</span></div>
            <div data-match-teams className="tw:mt-3 tw:flex tw:min-w-0 tw:flex-col tw:gap-2 tw:text-sm tw:text-[#132d58] tw:sm:grid tw:sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] tw:sm:items-center tw:sm:gap-3">
              <div data-match-home className="tw:min-w-0"><span className="tw:mb-0.5 tw:block tw:text-[10px] tw:font-semibold tw:uppercase tw:tracking-wide tw:text-[#607898] tw:sm:hidden">Mandante</span><strong className="tw:block tw:break-words">{match.homePair?.name ?? "A definir"}</strong></div>
              <div data-match-score className="tw:border-y tw:border-[#e4edf4] tw:py-2 tw:text-center tw:sm:border-0 tw:sm:py-0"><strong className="tw:block tw:whitespace-nowrap tw:text-[#078f7c]">{score}</strong>{games ? <span className="tw:block tw:whitespace-nowrap tw:text-xs tw:font-normal tw:text-[#607898]">{games}</span> : null}</div>
              <div data-match-away className="tw:min-w-0 tw:sm:text-right"><span className="tw:mb-0.5 tw:block tw:text-[10px] tw:font-semibold tw:uppercase tw:tracking-wide tw:text-[#607898] tw:sm:hidden">Visitante</span><strong className="tw:block tw:break-words">{match.awayPair?.name ?? "A definir"}</strong></div>
            </div>
          </article>;
        })}</div> : <p className={viewStyles.muted}>Nenhum jogo gerado para as categorias ativas deste evento.</p>}
      </>}
    </SectionCard> : activeTournaments.length ? <section className={ui.list} aria-label="Eventos em operação"><div className={`${ui.head} tw:grid-cols-[minmax(0,1fr)_140px_220px]`}><span>Evento</span><span>Categorias ativas</span><span className="tw:text-right">Ações</span></div>{activeTournaments.map(event => <article key={event.id} className={`${ui.row} tw:grid-cols-[minmax(0,1fr)_140px_220px] tw:viewport-760:grid-cols-[minmax(0,1fr)_auto] tw:viewport-760:[&>div:last-child]:col-span-full`}><strong>{event.name}</strong><span className="tw:text-xs">{event.categories.length} {event.categories.length === 1 ? "categoria ativa" : "categorias ativas"}</span><div className="tw:flex tw:flex-wrap tw:justify-end tw:gap-2"><Link href={`${eventDirectoryPath}${eventDirectoryPath.includes("?") ? "&" : "?"}tournamentId=${encodeURIComponent(event.id)}`} className={ui.secondary}>{canManageTournaments ? "Categorias" : "Ver jogos"}</Link>{canManageTournaments ? <Link href={`/torneios/${event.id}`} className={ui.primary}>Abrir evento</Link> : null}</div></article>)}</section> : <SectionCard title="Eventos" hideHeading><p className={ui.empty}>{searchParams?.status === "finished" ? "Nenhum evento finalizado." : "Nenhum evento ativo."}</p>{canManageTournaments && searchParams?.status !== "finished" ? <Link href="/torneios/novo" className={ui.primary}>Criar evento</Link> : null}</SectionCard>}
  </div>;
}
