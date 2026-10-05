import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./category-draw-panel.utilities";
import Link from "next/link";
import { SubmitButton } from "@/components/forms/submit-button";
import { StatusBadge } from "@/components/tournaments/status-badge";
import {
  generateCategoryDrawAction,
  moveCategoryPairAction,
  publishCategoryDrawAction,
  reopenCategoryLeagueForEditingAction,
} from "@/lib/actions/category-competition";
import { canGenerateCategoryDraw } from "@/lib/tournament-category/draw";

type DrawCategory = {
  id: string;
  name: string;
  competition: {
    id: string;
    format: "LEAGUE" | "THREE_GROUPS" | "FOUR_GROUPS" | "SIMPLE";
    status: string;
    pairs: Array<{
      id: string;
      name: string;
      groupId: string | null;
    }>;
    groups: Array<{
      id: string;
      name: string;
      pairs: Array<{
        id: string;
        name: string;
      }>;
    }>;
    matches: Array<{
      winnerPairId: string | null;
      homeScore: number | null;
      awayScore: number | null;
      homeSet1: number | null;
      awaySet1: number | null;
      homeSet2: number | null;
      awaySet2: number | null;
      homeSet3: number | null;
      awaySet3: number | null;
      manualStatus: string | null;
    }>;
  } | null;
};

function LeagueTrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" focusable="false">
      <path d="M8 4h8v4.5a4 4 0 0 1-8 0V4Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 6H5.5v1.25A3.25 3.25 0 0 0 8.75 10.5M16 6h2.5v1.25a3.25 3.25 0 0 1-3.25 3.25" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 12.5V17m-3.5 3h7M10 17h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PairPlayersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" focusable="false">
      <circle cx="9" cy="8" r="2.5" />
      <circle cx="16.5" cy="9" r="2" />
      <path d="M4.75 18.5c.45-3.1 2.05-4.65 4.25-4.65s3.8 1.55 4.25 4.65M14.25 14.4c.63-.4 1.38-.6 2.25-.6 1.9 0 3.25 1.38 3.65 3.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CategoryDrawPanel({
  tournamentId,
  categories,
}: {
  tournamentId: string;
  categories: DrawCategory[];
}) {
  if (!categories.length) {
    return (
      <div className="empty-state">
        <h3>Nenhuma categoria disponível</h3>
        <p>Configure categorias e duplas antes de montar os grupos.</p>
        <Link
          href={`/torneios/${tournamentId}?tab=categories`}
          className={viewStyles.button_button_primary}
        >
          Configurar categorias
        </Link>
      </div>
    );
  }

  return (
    <div className={viewStyles.stack_md}>
      {categories.map((category) => {
        const competition = category.competition;
        const canReopenLeague = competition?.format === "LEAGUE" && competition.status === "PUBLISHED" && competition.matches.every((match) => !match.winnerPairId && match.homeScore == null && match.awayScore == null && match.homeSet1 == null && match.awaySet1 == null && match.homeSet2 == null && match.awaySet2 == null && match.homeSet3 == null && match.awaySet3 == null && match.manualStatus !== "LIVE" && match.manualStatus !== "FINISHED");

        return (
          <article
            id={`category-${category.id}`}
            className={cx(`${viewStyles.section_card_stack_md_category_operation_panel} ${competition?.format === "LEAGUE" ? viewStyles.league_groups_panel : ""}`)}
            key={category.id}
          >
            <div className={cx(`${viewStyles.page_header} ${competition?.format === "LEAGUE" ? viewStyles.league_groups_hero : ""}`)}>
              <div className={viewStyles.stack_xs}>
                <h3>{category.name}</h3>
                <p className={viewStyles.muted}>
                  {competition?.pairs.length ?? 0} duplas ·{" "}
                  {competition?.groups.length ?? 0} grupos
                </p>
              </div>
              <StatusBadge status={competition?.status ?? "DRAFT"} />
            </div>

            {!competition ? (
              <p className={viewStyles.muted}>
                Configure a competição desta categoria antes do sorteio.
              </p>
            ) : (
              <>
                {competition.status === "DRAFT" ? (
                  <div className={cx(`${viewStyles.section_actions} ${competition.format === "LEAGUE" ? viewStyles.league_groups_actions : ""}`)}>
                    <form action={generateCategoryDrawAction}>
                      <input
                        type="hidden"
                        name="competitionId"
                        value={competition.id}
                      />
                      <SubmitButton
                        label={
                          competition.groups.length
                            ? "Gerar grupos novamente"
                            : "Gerar grupos"
                        }
                        pendingLabel="Gerando..."
                        className={viewStyles.button}
                        disabled={
                          !canGenerateCategoryDraw(
                            competition.format,
                            competition.pairs.length,
                          )
                        }
                      />
                    </form>

                    {competition.groups.length ? (
                      <form action={publishCategoryDrawAction}>
                        <input
                          type="hidden"
                          name="competitionId"
                          value={competition.id}
                        />
                        <SubmitButton
                          label="Publicar tabela e jogos"
                          pendingLabel="Publicando..."
                          className={viewStyles.button_button_primary}
                        />
                      </form>
                    ) : null}
                  </div>
                ) : canReopenLeague ? <div className={viewStyles.section_actions_league_groups_actions}><form action={reopenCategoryLeagueForEditingAction}><input type="hidden" name="competitionId" value={competition.id} /><SubmitButton label="Voltar para edição" pendingLabel="Reabrindo..." className={viewStyles.button_button_secondary} /></form><p className={viewStyles.muted}>Nenhum jogo foi iniciado. As duplas serão mantidas, mas a tabela atual será refeita.</p></div> : <p className={viewStyles.muted}>A composição foi publicada e não recebe mais ajustes.</p>}

                {competition.groups.length ? (
                  <div className={cx(`simple-grid simple-grid-2 ${competition.format === "LEAGUE" ? viewStyles.league_groups_list : ""}`)}>
                    {competition.groups.map((group) => (
                      <section className={cx(`${viewStyles.section_card} ${competition.format === "LEAGUE" ? viewStyles.league_group_card : ""}`)} key={group.id}>
                        <div className={cx(competition.format === "LEAGUE" ? viewStyles.league_group_card_heading : "")}>
                          {competition.format === "LEAGUE" ? <span className={viewStyles.league_group_icon} aria-hidden="true"><LeagueTrophyIcon /></span> : null}
                          <div>
                          <h4>{group.name}</h4>
                          <p className={viewStyles.muted}>
                            {group.pairs.length} duplas
                          </p>
                          </div>
                        </div>
                        {group.pairs.length ? (
                          <div className={cx(`${viewStyles.simple_list} ${competition.format === "LEAGUE" ? viewStyles.league_group_pair_list : ""}`)}>
                            {group.pairs.map((pair) => (
                              <div className={cx(`${viewStyles.simple_item} ${competition.format === "LEAGUE" ? viewStyles.league_group_pair : ""}`)} key={pair.id}>
                                {competition.format === "LEAGUE" ? <span className={viewStyles.league_group_pair_icon} aria-hidden="true"><PairPlayersIcon /></span> : null}
                                <strong>{pair.name}</strong>
                                {competition.status === "DRAFT" ? (
                                  <form
                                    action={moveCategoryPairAction}
                                    className="field-inline"
                                  >
                                    <input
                                      type="hidden"
                                      name="pairId"
                                      value={pair.id}
                                    />
                                    <select
                                      name="targetGroupId"
                                      defaultValue={group.id}
                                      aria-label={`Mover ${pair.name}`}
                                    >
                                      {competition.groups.map((targetGroup) => (
                                        <option
                                          key={targetGroup.id}
                                          value={targetGroup.id}
                                        >
                                          {targetGroup.name}
                                        </option>
                                      ))}
                                    </select>
                                    <SubmitButton
                                      label="Mover"
                                      pendingLabel="..."
                                      className={viewStyles.button}
                                    />
                                  </form>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className={viewStyles.muted}>Grupo vazio.</p>
                        )}
                      </section>
                    ))}
                  </div>
                ) : competition.pairs.length ? (
                  <div className={viewStyles.simple_list}>
                    {competition.pairs.map((pair) => (
                      <div className={viewStyles.simple_item} key={pair.id}>
                        <strong>{pair.name}</strong>
                        <span>Aguardando sorteio</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={viewStyles.muted}>
                    Adicione duplas na etapa de inscrições para habilitar o
                    sorteio.
                  </p>
                )}
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
