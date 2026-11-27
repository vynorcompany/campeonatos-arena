import { groupDisplayStandings } from "@/lib/tournament-category/group-display-order";
import { CategoryOverviewSettings } from "@/components/tournaments/category-overview-settings";
import { IndividualRegistrationPanel } from "@/components/tournaments/individual-registration-panel";
import { CategoryOverviewRoster } from "@/components/tournaments/category-overview-roster";
import { tournamentWorkspace as categoryUi } from "@/components/tournaments/tournament-workspace";
import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CategoryCompetitionForm,
  CategoryPublicVisibilityForm,
} from "@/components/tournaments/category-competition-form";
import { CategoryDrawPanel } from "@/components/tournaments/category-draw-panel";
import { CategoryRegistrationPanel } from "@/components/tournaments/category-registration-panel";
import { CategoryResultsPanel } from "@/components/tournaments/category-results-panel";
import { LeagueMedicalRequestsPanel } from "@/components/tournaments/league-medical-requests-panel";
import { LeagueHistoryPanel } from "@/components/tournaments/league-history-panel";
import { LeagueCategorySettingsDialog } from "@/components/tournaments/league-category-settings-dialog";
import { TournamentCategorySettingsForm } from "@/components/tournaments/tournament-category-settings-form";
import { LeagueIcon } from "@/components/tournaments/league-icon";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { TournamentDetailLayout } from "@/components/tournaments/tournament-detail-layout";
import { type TournamentTabKey } from "@/components/tournaments/tournament-tabs";
import { requireModuleView } from "@/lib/auth/guards";
import { canPerformPermission } from "@/lib/permissions";
import { runLeagueLifecycleAction, updateLeaguePrizeAction } from "@/lib/actions/category-competition";
import { getTournamentCategoryWorkspace } from "@/lib/tournaments/category-workspace";
import { canGenerateCategoryDraw } from "@/lib/tournament-category/draw";
import { buildPlacementStages } from "@/lib/tournament-category/ranking";
import { rankStandings } from "@/lib/tournament-category/standings";
import { resolveLeagueTier } from "@/lib/league/tier";

type CategoryPageProps = {
  params: Promise<{
    tournamentId: string;
    categoryId: string;
  }>;
  searchParams?: Promise<{ tab?: string; sort?: string; status?: string; player?: string; reopened?: string }>;
};

const overviewStatusLabels: Record<string,string> = { DRAFT:"Rascunho", READY_FOR_DRAW:"Pronto para sorteio", GROUPS_DEFINED:"Grupos definidos", MATCHES_DEFINED:"Jogos definidos", PUBLISHED:"Publicado", IN_PROGRESS:"Em andamento", FINISHED:"Finalizado", REGISTRATIONS:"Inscrições", EDITING:"Editando", LIVE:"Acontecendo" };

const validTabs: TournamentTabKey[] = [
  "overview",
  "registrations",
  "groups",
  "games",
  "results",
  "history",
];

const formatLabels = {
  LEAGUE: "Liga",
  THREE_GROUPS: "3 grupos",
  FOUR_GROUPS: "4 grupos",
  SIMPLE: "Simples",
  TRIO: "Trio",
} as const;

export default async function CategoryPage(props: CategoryPageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const auth = await requireModuleView("tournaments");
  const canManage = canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions);
  const canRecordResults = canPerformPermission("tournaments:results", auth.arenaRole, auth.systemRole, auth.editPermissions);
  if (!canManage && !canRecordResults) redirect(`/jogos?tournamentId=${encodeURIComponent(params.tournamentId)}`);
  const { category, athletes, pairRankings, medicalRequests, individualAccounts, currentReferenceMonth, redirectToGames } = await getTournamentCategoryWorkspace(params.tournamentId, params.categoryId);
  if (redirectToGames) redirect(`/jogos?tournamentId=${encodeURIComponent(params.tournamentId)}`);

  if (!category) {
    notFound();
  }

  if (category.archivedAt && !canManage) notFound();

  const competition = category.competition;
  if (category.archivedAt) return <main className="tw:grid tw:min-w-0 tw:gap-4">
    <Link className={categoryUi.primary} href={`/torneios/${params.tournamentId}`}>Voltar ao evento</Link>
    <section role="status" className="tw:grid tw:gap-2 tw:rounded tw:border tw:border-[#a02119] tw:bg-white tw:p-3 tw:text-sm tw:text-[#82221b]"><h1 className="tw:m-0 tw:text-lg tw:font-semibold">{category.name} · removida do evento</h1><p className="tw:m-0">Novas inscrições estão bloqueadas. Pagamentos, resultados e históricos foram preservados.</p><span>{category._count.registrations} inscrições registradas · consulta somente leitura</span><Link className={categoryUi.primary} href={`/torneios/${params.tournamentId}/inscricoes`}>Consultar inscrições e pagamentos</Link></section>
    {competition ? <section className="tw:grid tw:min-w-0 tw:gap-2"><h2 className="tw:m-0 tw:text-base tw:font-semibold tw:text-[#174983]">Resultados preservados</h2>{competition.matches.length ? competition.matches.map(match => <article key={match.id} className="tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_auto] tw:gap-2 tw:border-b tw:border-[#cfdaea] tw:py-2 tw:text-sm tw:text-[#231f20]"><div className="tw:min-w-0 tw:break-words"><strong>{match.label}</strong><p className="tw:m-0 tw:mt-1">{match.homePair?.players.map(member => member.player.name).join(" / ") || match.homePair?.name || "A definir"} × {match.awayPair?.players.map(member => member.player.name).join(" / ") || match.awayPair?.name || "A definir"}</p></div><strong className="tw:whitespace-nowrap">{match.homeScore ?? "—"} × {match.awayScore ?? "—"}</strong></article>) : <p className="tw:text-sm tw:text-[#465c75]">Nenhum placar registrado.</p>}{competition.leagueCycles.length ? <div className="tw:grid tw:gap-2"><h3 className="tw:text-sm tw:font-semibold">Ciclos preservados</h3>{competition.leagueCycles.map(cycle => <p key={cycle.id} className="tw:m-0 tw:text-sm tw:text-[#231f20]">{cycle.referenceMonth} · {cycle.status === "CLOSED" ? "Encerrado" : "Aberto"}{cycle.prizeDescription ? ` · ${cycle.prizeDescription}` : ""}</p>)}</div> : null}</section> : null}
  </main>;
  const individual = category.registrationType === "INDIVIDUAL";
  if (individual && !canManage) redirect(`/jogos?tournamentId=${params.tournamentId}`);
  const requestedTab = searchParams?.tab as TournamentTabKey | undefined;
  const availableTabs: TournamentTabKey[] = individual ? ["overview", "registrations"] : canManage ? validTabs : competition?.format === "LEAGUE" ? ["games", "results", "history"] : ["games", "results"];
  const tab = requestedTab && availableTabs.includes(requestedTab)
    ? requestedTab
    : canManage ? "overview" : "games";
  const gameSort =
    searchParams?.sort === "date" || searchParams?.sort === "status"
      ? searchParams.sort
      : "round";
  const gameStatusFilter =
    searchParams?.status === "WAITING" ||
    searchParams?.status === "SCHEDULED" ||
    searchParams?.status === "LIVE" ||
    searchParams?.status === "FINISHED"
      ? searchParams.status
      : "ALL";
  const isPublicTournament = category.tournament.creationMode === "PUBLIC";
  const standardCategories = category.tournament.categories.filter(
    (item) => item.id !== category.id && Boolean(item.standardKey),
  );
  const completedSportsMatches =
    competition?.matches.filter(
      (
        match,
      ): match is typeof match & {
        homePairId: string;
        awayPairId: string;
        winnerPairId: string;
        homeScore: number;
        awayScore: number;
      } =>
        Boolean(
          match.homePairId &&
            match.awayPairId &&
            match.winnerPairId &&
            match.homeScore != null &&
            match.awayScore != null,
        ),
    ) ?? [];
  const leagueStandings =
    competition?.format === "LEAGUE"
      ? rankStandings(
          competition.pairs.map((pair) => {
            const pairMatches = completedSportsMatches.filter(
              (match) =>
                match.homePairId === pair.id || match.awayPairId === pair.id,
            );
            return {
              pairId: pair.id,
              victories: pairMatches.filter(
                (match) => match.winnerPairId === pair.id,
              ).length,
              differential: pairMatches.reduce(
                (total, match) =>
                  total +
                  (match.homePairId === pair.id
                    ? match.homeScore - match.awayScore
                    : match.awayScore - match.homeScore),
                0,
              ),
            };
          }),
          completedSportsMatches,
        ).map((row, index) => {
          const matches = completedSportsMatches.filter(
            (match) =>
              match.homePairId === row.pairId ||
              match.awayPairId === row.pairId,
          ).length;
          return {
            position: index + 1,
            pairName:
              competition.pairs.find((pair) => pair.id === row.pairId)?.name ??
              "Dupla removida",
            matches,
            victories: row.victories,
            losses: matches - row.victories,
            differential: row.differential,
          };
        })
      : [];
  const knockoutPlacement =
    competition &&
    competition.format !== "LEAGUE" &&
    completedSportsMatches.some((match) => match.stage === "FINAL")
      ? [...buildPlacementStages({
          format: competition.format,
          pairIds: competition.pairs.map((pair) => pair.id),
          matches: competition.matches,
        })]
          .filter(
            ([, stage]) => stage === "CHAMPION" || stage === "RUNNER_UP",
          )
          .sort(([, first], [, second]) =>
            first === "CHAMPION" ? -1 : second === "CHAMPION" ? 1 : 0,
          )
          .map(([pairId], index) => ({
            position: index + 1,
            pairName:
              competition.pairs.find((pair) => pair.id === pairId)?.name ??
              "Dupla removida",
          }))
      : [];
  const groupStandings = competition?.format !== "LEAGUE" ? competition?.groups.map(group => ({
    id: group.id,
    name: group.name,
    rows: groupDisplayStandings(group.pairs, competition.matches).map(({ pair, ...row }) => ({ ...row, pairName: pair.name })),
  })) ?? [] : [];
  const sportsResults = { leagueStandings, groupStandings, knockoutPlacement };
  const categoryView = {
    id: category.id,
    name: category.name,
    class: category.class,
    gender: category.gender,
    registrations: category.registrations,
    competition: competition
      ? {
          id: competition.id,
          format: competition.format,
          leagueTier: resolveLeagueTier(category.name, competition.leagueTier),
          status: competition.status,
          pairs: competition.pairs.map((pair) => ({
            id: pair.id,
            name: pair.name,
            groupId: pair.groupId,
            playerNames: pair.players.map(
              (pairPlayer) => pairPlayer.player.name,
            ),
            playerIds: pair.players.map(
              (pairPlayer) => pairPlayer.player.id,
            ),
          })),
          groups: competition.groups.map((group) => ({
            id: group.id,
            name: group.name,
            pairs: group.pairs,
          })),
          matches: competition.matches.map((match) => ({
            homePairId: match.homePairId,
            awayPairId: match.awayPairId,
            id: match.id,
            label: match.label,
            stage: match.stage,
            roundOrder: match.roundOrder,
            courtName: match.courtName,
            scheduledDate: match.scheduledDate,
            scheduledTime: match.scheduledTime,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            homeSet1: match.homeSet1,
            awaySet1: match.awaySet1,
            homeSet2: match.homeSet2,
            awaySet2: match.awaySet2,
            homeSet3: match.homeSet3,
            awaySet3: match.awaySet3,
            manualStatus: match.manualStatus,
            winnerPairId: match.winnerPairId,
            leagueBlock: match.leagueBlock,
            woReason: match.woReason,
            trioGames: match.trioGames,
            homePair: match.homePair,
            awayPair: match.awayPair,
            winnerPair: match.winnerPair,
            })),
          sportsResults,
        }
      : null,
  };
  const completedMatchCount =
    competition?.matches.filter((match) => match.winnerPair).length ?? 0;
  const nextStep = !competition
    ? {
        label: "Configurar categoria",
        href: `/torneios/${params.tournamentId}/categorias/${category.id}?tab=overview`,
      }
    : competition.status === "FINISHED"
      ? null
      : competition.status === "PUBLISHED"
        ? {
            label:
              competition.matches.length > 0 &&
              completedMatchCount === competition.matches.length
                ? "Encerrar categoria"
                : "Registrar resultados",
            href: `/torneios/${params.tournamentId}/categorias/${category.id}?tab=${competition.matches.length > 0 && completedMatchCount === competition.matches.length ? "results" : "games"}`,
          }
        : !canGenerateCategoryDraw(competition.format, competition.pairs.length)
          ? {
              label: competition.format === "TRIO" ? "Adicionar trios" : "Adicionar duplas",
              href: `/torneios/${params.tournamentId}/categorias/${category.id}?tab=registrations`,
            }
          : competition.groups.length === 0
            ? {
                label: "Gerar grupos",
                href: `/torneios/${params.tournamentId}/categorias/${category.id}?tab=groups`,
              }
            : {
                label: "Publicar tabela",
                href: `/torneios/${params.tournamentId}/categorias/${category.id}?tab=groups`,
              };

  return (
      <div className={viewStyles.stack_md_t_category_workspace_category_detail_workspace}>
      <Link
        href={canManage ? `/torneios/${params.tournamentId}` : `/jogos?tournamentId=${params.tournamentId}`}
        className={viewStyles.t_category_back}
      >
        <span aria-hidden="true">←</span> Categorias
      </Link>



      <TournamentDetailLayout
        tournamentId={params.tournamentId}
        categoryId={category.id}
        activeTab={tab}
        availableTabs={availableTabs}
        counts={{ registrations: individual ? category.registrations.length : competition?.pairs.length ?? 0, games: `${completedMatchCount}/${competition?.matches.length ?? 0}` }}
      >
        {tab === "overview" ? (
          individual ? <div className="tw:grid tw:min-w-0 tw:gap-4"><header className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-start tw:justify-between tw:gap-3"><div><h1 className="tw:m-0 tw:text-lg tw:font-medium tw:text-[#202c3c]">{category.name}</h1><p className="tw:m-0 tw:mt-2 tw:text-xs tw:text-[#465c75]">Individual · sem jogos · {category.registrations.length} inscrições</p></div><span className="tw:text-xs tw:text-[#087443]">{category.active ? "Ativa" : "Inativa"}</span></header><section className="tw:grid tw:min-w-0 tw:gap-3 tw:rounded-md tw:border tw:border-[#e1e4e9] tw:p-4"><header className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2"><h2 className="tw:m-0 tw:text-base tw:font-medium">Inscrições</h2><Link className={categoryUi.primary} href={`/torneios/${params.tournamentId}/categorias/${category.id}?tab=registrations`}>Gerenciar</Link></header><div className={categoryUi.list}><div className={categoryUi.head + " tw:grid-cols-[minmax(0,1fr)_110px]"}><span>Participante</span><span>Situação</span></div>{category.registrations.length ? category.registrations.map(registration=><div key={registration.id} className={categoryUi.row + " tw:grid-cols-[minmax(0,1fr)_110px] tw:viewport-480:grid-cols-1"}><span className="tw:break-words">{registration.leadName}</span><span className={registration.status === "CANCELED" ? "tw:text-xs tw:text-[#a02119]" : "tw:text-xs tw:text-[#087443]"}>{registration.status === "CONFIRMED" ? "Confirmada" : registration.status === "CANCELED" ? "Cancelada" : "Pendente"}</span></div>) : <p className={categoryUi.empty}>Nenhum atleta inscrito.</p>}</div></section><CategoryOverviewSettings first={category.priceFirstCents} second={category.priceSecondCents} third={category.priceThirdCents} limit={category.maxRegistrations}><TournamentCategorySettingsForm category={{ ...category, registrationTypeLocked: category._count.registrations > 0 || Boolean(competition) }} standardCategories={standardCategories}/></CategoryOverviewSettings></div> : competition?.format === "LEAGUE" ? (
          <div className={viewStyles.league_overview_dashboard}>
            {searchParams?.reopened === "1" && competition.leagueCycles[0]?.status === "OPEN"
              && competition.leagueCycles[0]?.referenceMonth === currentReferenceMonth
              ? <p className={viewStyles.league_reopened_notice} role="status">Ciclo da Liga reaberto. Os jogos estão disponíveis novamente.</p>
              : null}
            <article id={`category-${category.id}`} className={viewStyles.league_overview_hero}>
              <header className={viewStyles.league_overview_header}>
                <div>
                  <div className={viewStyles.league_overview_title_row}>
                    <h1>{category.name}</h1>
                    <CategoryPublicVisibilityForm competitionId={competition.id} isPublic={competition.isPublic} />
                    <LeagueCategorySettingsDialog category={{ id: category.id, name: category.name, class: category.class, gender: category.gender, leagueTier: resolveLeagueTier(category.name, competition.leagueTier), registrationFeeCents: competition.registrationFeeCents }} />
                  </div>
                </div>
                <div className={viewStyles.league_overview_status + " tw:text-xs tw:text-[#465c75]"}>{overviewStatusLabels[competition.status] ?? competition.status}</div>
              </header>

              <p className={viewStyles.league_overview_context}>
                {category.class || "Classe pendente"} · {category.gender || "Gênero pendente"}
                {" · "}{formatLabels[competition.format]} · Ranking: {competition.ranking?.name ?? "Sem ranking"}
              </p>

              <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-2">
                {nextStep ? <Link href={nextStep.href} className={nextStep.label === "Registrar resultados" ? categoryUi.success : nextStep.label === "Encerrar categoria" ? categoryUi.warning : categoryUi.primary}>{nextStep.label}</Link> : <span className={viewStyles.pill}>Categoria concluída</span>}
              </div>
            </article>
            <CategoryOverviewRoster pairs={competition.pairs} groups={competition.groups} registrationsHref={`/torneios/${params.tournamentId}/categorias/${category.id}?tab=registrations`} />
            {isPublicTournament ? <CategoryOverviewSettings first={category.priceFirstCents} second={category.priceSecondCents} third={category.priceThirdCents} limit={category.maxRegistrations}><TournamentCategorySettingsForm category={{...category, competitionFormat: competition.format, registrationTypeLocked: true}} standardCategories={standardCategories}/></CategoryOverviewSettings> : null}
            <details className={categoryUi.panel}>
             <summary className="tw:cursor-pointer tw:text-xs tw:text-[var(--muted)]">Premiação e ciclo da Liga</summary>
             <p className="tw:m-0 tw:text-xs tw:text-[var(--muted)]">Ranking geral: {competition.feedsGeneralRanking ? "Ativo" : "Inativo"}</p>
             <div className={viewStyles.league_overview_bottom}>
              <section className={viewStyles.league_prize_card} aria-labelledby="league-prize-title">
                <form action={updateLeaguePrizeAction} className={viewStyles.league_prize_form}>
                  <div className={viewStyles.league_prize_card_heading}>
                    <span className={viewStyles.league_overview_section_icon}><LeagueIcon name="trophy" /></span>
                    <div><h2 id="league-prize-title">Premiação</h2><p>Prêmio do ciclo atual</p></div>
                    <span className={viewStyles.league_prize_edit_icon}><LeagueIcon name="edit" /></span>
                  </div>
                  <div className={viewStyles.league_prize_editor}>
                    <input type="hidden" name="competitionId" value={competition.id} />
                    <textarea
                      className={viewStyles.league_prize_textarea}
                      name="prizeDescription"
                      rows={4}
                      defaultValue={competition.leagueCycles.find((cycle) => cycle.status === "OPEN")?.prizeDescription ?? ""}
                      placeholder="Descreva a premiação da Liga. Ex.: campeãs recebem troféu, voucher e premiação em dinheiro."
                    />
                    <div className={viewStyles.league_prize_actions}><button className={categoryUi.success} type="submit"><LeagueIcon name="save" /> Salvar premiação</button></div>
                  </div>
                </form>
              </section>

              <aside className={viewStyles.league_cycle_card}>
                <div className={viewStyles.league_cycle_card_heading}><span className={viewStyles.league_overview_section_icon}><LeagueIcon name="calendar" /></span><h2>Ciclo mensal</h2></div>
                <p>Fecha o mês vigente, registra campeã e executa acesso ou rebaixamento.</p>
                <SafeActionForm action={runLeagueLifecycleAction} successMessage="Ciclo da Liga processado com sucesso. Confira o histórico mensal." confirmKeyword="PROCESSAR" confirmPrompt="O ciclo será encerrado e as duplas poderão mudar de divisão. Digite PROCESSAR para confirmar.">
                  <input type="hidden" name="competitionId" value={competition.id} />
                  <button className={categoryUi.warning} type="submit"><LeagueIcon name="refresh" /> Processar ciclo da Liga</button>
                </SafeActionForm>
              </aside>
            </div>

            </details>
            {medicalRequests.length > 0 ? <LeagueMedicalRequestsPanel requests={medicalRequests} /> : null}
          </div>
          ) : (
          <div className="tw:grid tw:min-w-0 tw:gap-4">
                <article id={`category-${category.id}`} className={viewStyles.category_overview_category_detail_hero}>
              <div className={viewStyles.category_overview_head}>
                <div className={viewStyles.stack_xs}>
                  <div className={viewStyles.category_overview_title_row}><h1>{category.name}</h1>{competition ? <CategoryPublicVisibilityForm competitionId={competition.id} isPublic={competition.isPublic} /> : null}</div>
                </div>
                <span className="tw:text-xs tw:font-normal tw:text-[#465c75]">{overviewStatusLabels[competition?.status ?? "DRAFT"] ?? competition?.status}</span>
              </div>

              <p className={viewStyles.category_overview_context_muted}>
                {category.class || "Classe pendente"} · {category.gender || "Gênero pendente"}
                {competition ? (
                  <>
                    {" · "}
                    {formatLabels[competition.format]} · Ranking: {competition.ranking?.name ?? "Sem ranking"}
                  </>
                ) : null}
              </p>

              <div className={viewStyles.category_overview_action}>
                {nextStep ? (
                  <Link href={nextStep.href} className={viewStyles.button_button_primary}>
                    {nextStep.label}
                  </Link>
                ) : (
                  <span className={viewStyles.pill}>Categoria concluída</span>
                )}
              </div>
            </article>
            {competition ? <><CategoryOverviewRoster pairs={competition.pairs} groups={competition.groups} trio={competition.format === "TRIO"} registrationsHref={`/torneios/${params.tournamentId}/categorias/${category.id}?tab=registrations`} /><p className="tw:m-0 tw:text-xs tw:text-[var(--muted)]">Ranking geral: {competition.feedsGeneralRanking ? "Ativo" : "Inativo"}</p></> : null}
            {!competition && isPublicTournament && !individual && canManage ? <section className={categoryUi.panel} aria-labelledby="category-format-title"><h2 id="category-format-title" className="tw:m-0 tw:text-base tw:font-medium tw:text-[#174983]">Formato de jogos</h2><p className="tw:m-0 tw:text-xs tw:text-[#465c75]">Escolha Trio para inscrever três atletas por equipe.</p>{category._count.registrations > 0 ? <p role="status" className="tw:m-0 tw:text-xs tw:text-[#945000]">Esta categoria já possui inscrições. Elas não serão convertidas para trio; crie uma nova categoria para esse formato.</p> : <CategoryCompetitionForm categoryId={category.id} categoryName={category.name} pairRankings={pairRankings} defaultFormat=""/>}</section> : null}
            {isPublicTournament ? (
              <CategoryOverviewSettings first={category.priceFirstCents} second={category.priceSecondCents} third={category.priceThirdCents} limit={category.maxRegistrations}>
                <TournamentCategorySettingsForm
                  category={{
                    id: category.id,
                    name: category.name,
                    registrationType: category.registrationType,
                    competitionFormat: competition?.format,
                    registrationTypeLocked: category._count.registrations > 0 || Boolean(competition),
                    maxRegistrations: category.maxRegistrations,
                    priceFirstCents: category.priceFirstCents,
                    priceSecondCents: category.priceSecondCents,
                    priceThirdCents: category.priceThirdCents,
                    active: category.active,
                    allowedRegistrationCategoryIds: category.allowedRegistrationCategoryIds,
                  }}
                  standardCategories={standardCategories}
                />
              </CategoryOverviewSettings>
            ) : !competition ? (
              <article className={viewStyles.section_card}>
                <CategoryCompetitionForm
                  categoryId={category.id}
                  categoryName={category.name}
                  pairRankings={pairRankings}
                />
              </article>
            ) : null}
          </div>
          )
        ) : null}

        {tab === "registrations" ? (individual ? <IndividualRegistrationPanel tournamentId={params.tournamentId} categoryId={category.id} registrations={category.registrations} athletes={athletes} accounts={individualAccounts} defaultAmountCents={category.priceFirstCents}/> :
          <CategoryRegistrationPanel
            tournamentId={params.tournamentId}
            categories={[categoryView]}
            athletes={athletes.map((athlete) => ({ ...athlete, leagueTier: athlete.leagueAthleteTiers[0]?.tier ?? "" }))}
          />
        ) : null}

        {tab === "groups" ? (
          <CategoryDrawPanel
            canManage={canManage}
            tournamentId={params.tournamentId}
            categories={[categoryView]}
          />
        ) : null}

        {tab === "games" ? (
          <CategoryResultsPanel
            tournamentId={params.tournamentId}
            categories={[categoryView]}
            mode="games"
            sort={gameSort}
            statusFilter={gameStatusFilter}
            playerSearch={searchParams?.player?.trim() ?? ""}
            canManage={canManage}
            canRecordResults={canRecordResults}
          />
        ) : null}

        {tab === "results" ? (
          <CategoryResultsPanel
            tournamentId={params.tournamentId}
            categories={[categoryView]}
            mode="summary"
            canManage={canManage}
            canRecordResults={canRecordResults}
          />
        ) : null}

        {tab === "history" && competition?.format === "LEAGUE" ? (
          <LeagueHistoryPanel
            successHref={`/torneios/${params.tournamentId}/categorias/${params.categoryId}?tab=overview&reopened=1`}
            cycles={competition.leagueCycles.map(cycle => ({ id: cycle.id, referenceMonth: cycle.referenceMonth, status: cycle.status, ...cycle.history }))}
          />
        ) : null}
      </TournamentDetailLayout>
    </div>
  );
}
