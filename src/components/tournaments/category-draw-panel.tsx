import Link from "next/link";
import { SubmitButton } from "@/components/forms/submit-button";
import { StatusBadge } from "@/components/tournaments/status-badge";
import {
  generateCategoryDrawAction,
  moveCategoryPairAction,
  publishCategoryDrawAction,
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
  } | null;
};

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
          className="button button-primary"
        >
          Configurar categorias
        </Link>
      </div>
    );
  }

  return (
    <div className="stack-md">
      {categories.map((category) => {
        const competition = category.competition;

        return (
          <article
            id={`category-${category.id}`}
            className="section-card stack-md category-operation-panel"
            key={category.id}
          >
            <div className="page-header">
              <div className="stack-xs">
                <h3>{category.name}</h3>
                <p className="muted">
                  {competition?.pairs.length ?? 0} duplas ·{" "}
                  {competition?.groups.length ?? 0} grupos
                </p>
              </div>
              <StatusBadge status={competition?.status ?? "DRAFT"} />
            </div>

            {!competition ? (
              <p className="muted">
                Configure a competição desta categoria antes do sorteio.
              </p>
            ) : (
              <>
                {competition.status === "DRAFT" ? (
                  <div className="section-actions">
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
                        className="button"
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
                          className="button button-primary"
                        />
                      </form>
                    ) : null}
                  </div>
                ) : (
                  <p className="muted">
                    A composição foi publicada e não recebe mais ajustes.
                  </p>
                )}

                {competition.groups.length ? (
                  <div className="simple-grid simple-grid-2">
                    {competition.groups.map((group) => (
                      <section className="section-card stack-sm" key={group.id}>
                        <div>
                          <h4>{group.name}</h4>
                          <p className="muted">
                            {group.pairs.length} duplas
                          </p>
                        </div>
                        {group.pairs.length ? (
                          <div className="simple-list">
                            {group.pairs.map((pair) => (
                              <div className="simple-item" key={pair.id}>
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
                                      className="button"
                                    />
                                  </form>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="muted">Grupo vazio.</p>
                        )}
                      </section>
                    ))}
                  </div>
                ) : competition.pairs.length ? (
                  <div className="simple-list">
                    {competition.pairs.map((pair) => (
                      <div className="simple-item" key={pair.id}>
                        <strong>{pair.name}</strong>
                        <span>Aguardando sorteio</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">
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
