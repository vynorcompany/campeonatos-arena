import Link from "next/link";
import { SubmitButton } from "@/components/forms/submit-button";
import { StatusBadge } from "@/components/tournaments/status-badge";
import { addManualPairAction } from "@/lib/actions/category-competition";
import { canAddCategoryPair } from "@/lib/tournament-category/draw";
import { matchesCategoryEligibility } from "@/lib/tournament-category/eligibility";

type AthleteOption = {
  id: string;
  name: string;
  active: boolean;
  class: string;
  gender: string;
};

type RegistrationCategory = {
  id: string;
  name: string;
  class: string;
  gender: string;
  competition: {
    id: string;
    format: "LEAGUE" | "THREE_GROUPS" | "FOUR_GROUPS" | "SIMPLE";
    status: string;
    pairs: Array<{
      id: string;
      name: string;
      playerNames: string[];
    }>;
  } | null;
  registrations: Array<{
    id: string;
    leadName: string;
    partnerName: string;
    status: string;
    paymentStatus: string;
  }>;
};

export function CategoryRegistrationPanel({
  tournamentId,
  categories,
  athletes,
}: {
  tournamentId: string;
  categories: RegistrationCategory[];
  athletes: AthleteOption[];
}) {
  if (!categories.length) {
    return (
      <div className="empty-state">
        <h3>Nenhuma categoria configurada</h3>
        <p>Crie uma categoria antes de incluir duplas.</p>
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
        const eligibleAthletes = athletes.filter(
          (athlete) =>
            athlete.active &&
            matchesCategoryEligibility(
              { className: category.class, gender: category.gender },
              { className: athlete.class, gender: athlete.gender },
            ),
        );
        const canAcceptManualPair =
          category.competition?.status === "DRAFT" &&
          canAddCategoryPair(
            category.competition.format,
            category.competition.pairs.length,
          );

        return (
          <article
            id={`category-${category.id}`}
            className="section-card stack-md"
            key={category.id}
          >
            <div className="page-header">
              <div className="stack-xs">
                <h3>{category.name}</h3>
                <p className="muted">
                  {category.class || "Classe pendente"} ·{" "}
                  {category.gender || "Gênero pendente"}
                </p>
              </div>
              <StatusBadge
                status={category.competition?.status ?? "DRAFT"}
              />
            </div>

            {!category.competition ? (
              <p className="muted">
                Configure a competição desta categoria antes de adicionar
                duplas.
              </p>
            ) : (
              <>
                {canAcceptManualPair ? (
                  <form action={addManualPairAction} className="grid-form">
                    <input
                      type="hidden"
                      name="competitionId"
                      value={category.competition.id}
                    />
                    <div className="field">
                      <label htmlFor={`first-player-${category.id}`}>
                        Primeiro atleta
                      </label>
                      <select
                        id={`first-player-${category.id}`}
                        name="firstPlayerId"
                        required
                      >
                        <option value="">Selecione</option>
                        {eligibleAthletes.map((athlete) => (
                          <option key={athlete.id} value={athlete.id}>
                            {athlete.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor={`second-player-${category.id}`}>
                        Segundo atleta
                      </label>
                      <select
                        id={`second-player-${category.id}`}
                        name="secondPlayerId"
                        required
                      >
                        <option value="">Selecione</option>
                        {eligibleAthletes.map((athlete) => (
                          <option key={athlete.id} value={athlete.id}>
                            {athlete.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field field-submit form-full">
                      <SubmitButton
                        label="Adicionar dupla"
                        pendingLabel="Adicionando..."
                        className="button button-primary"
                        disabled={eligibleAthletes.length < 2}
                      />
                    </div>
                    {eligibleAthletes.length < 2 ? (
                      <p className="muted form-full">
                        Cadastre ao menos dois atletas ativos com esta classe e
                        gênero em{" "}
                        <Link href="/players">Gestão → Atletas</Link>.
                      </p>
                    ) : null}
                  </form>
                ) : category.competition.status !== "DRAFT" ? (
                  <p className="muted">
                    As inscrições manuais ficam bloqueadas após a publicação.
                  </p>
                ) : (
                  <p className="muted">
                    O formato Simples atingiu o limite de 16 duplas. Gere os
                    grupos para continuar.
                  </p>
                )}

                <div className="stack-sm">
                  <h4>Duplas confirmadas</h4>
                  {category.competition.pairs.length ? (
                    <div className="simple-list">
                      {category.competition.pairs.map((pair) => (
                        <div className="simple-item" key={pair.id}>
                          <strong>{pair.name}</strong>
                          <span>
                            {pair.playerNames.length
                              ? pair.playerNames.join(" / ")
                              : "Atletas vinculados"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">Nenhuma dupla confirmada.</p>
                  )}
                </div>
              </>
            )}

            {category.registrations.length ? (
              <div className="stack-sm">
                <h4>Inscrições recebidas pelo link público</h4>
                <p className="muted">
                  Nesta etapa, as inscrições públicas permanecem somente para
                  consulta.
                </p>
                <div className="simple-list">
                  {category.registrations.map((registration) => (
                    <div className="simple-item" key={registration.id}>
                      <div className="match-copy">
                        <strong>
                          {registration.leadName} / {registration.partnerName}
                        </strong>
                        <span>Pagamento: {registration.paymentStatus}</span>
                      </div>
                      <StatusBadge status={registration.status} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
