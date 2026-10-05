import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./category-registration-panel.utilities";
import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { AthleteSearchField, CategoryPairForm } from "@/components/tournaments/category-pair-form";
import { StatusBadge } from "@/components/tournaments/status-badge";
import {
  replaceCategoryPairPlayerAction,
  removeCategoryPairAction,
} from "@/lib/actions/category-competition";
import { canAddCategoryPair } from "@/lib/tournament-category/draw";
import {
  getAvailableCategoryAthletes,
  matchesCategoryEligibility,
} from "@/lib/tournament-category/eligibility";

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
      playerIds: string[];
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
        const eligibleAthletes = athletes.filter(
          (athlete) =>
            athlete.active &&
            matchesCategoryEligibility(
              { className: category.class, gender: category.gender },
              { className: athlete.class, gender: athlete.gender },
            ),
        );
        const availableAthletes = getAvailableCategoryAthletes(
          eligibleAthletes,
          category.competition?.pairs.flatMap((pair) => pair.playerIds) ?? [],
        );
        const canRemovePair = category.competition?.status === "DRAFT";
        const canReplacePairPlayer = category.competition?.status === "PUBLISHED";
        const canAcceptManualPair =
          category.competition?.status === "DRAFT" &&
          canAddCategoryPair(
            category.competition.format,
            category.competition.pairs.length,
          );

        return (
          <article
            id={`category-${category.id}`}
            className={cx(`${viewStyles.section_card_stack_md_category_operation_panel} ${category.competition?.format === "LEAGUE" ? viewStyles.league_registration_panel : ""}`)}
            key={category.id}
          >
            <div className={cx(`${viewStyles.page_header} ${category.competition?.format === "LEAGUE" ? viewStyles.league_registration_hero : ""}`)}>
              <div className={viewStyles.stack_xs}>
                <h3>{category.name}</h3>
                <p className={viewStyles.muted}>
                  {category.class || "Classe pendente"} ·{" "}
                  {category.gender || "Gênero pendente"}
                </p>
              </div>
              <StatusBadge
                status={category.competition?.status ?? "DRAFT"}
              />
            </div>

            {!category.competition ? (
              <p className={viewStyles.muted}>
                Configure a competição desta categoria antes de adicionar
                duplas.
              </p>
            ) : (
              <>
                {canAcceptManualPair ? (
                  <CategoryPairForm competitionId={category.competition.id} athletes={availableAthletes} />
                ) : category.competition.status !== "DRAFT" ? (
                  <p className={viewStyles.muted}>
                    As inscrições manuais ficam bloqueadas após a publicação.
                  </p>
                ) : (
                  <p className={viewStyles.muted}>
                    O formato Simples atingiu o limite de 16 duplas. Gere os
                    grupos para continuar.
                  </p>
                )}

                <div className={cx(`stack-sm ${category.competition.format === "LEAGUE" ? viewStyles.league_registration_list_section : ""}`)}>
                  <h4>Duplas confirmadas</h4>
                  {category.competition.pairs.length ? (
                    <div className={cx(`${viewStyles.simple_list} ${category.competition.format === "LEAGUE" ? viewStyles.league_registration_list : ""}`)}>
                      {category.competition.pairs.map((pair) => (
                        <div className={cx(`${viewStyles.simple_item} ${category.competition?.format === "LEAGUE" ? viewStyles.league_registration_card : ""}`)} key={pair.id}>
                          <div className={cx(`${viewStyles.match_copy} ${category.competition?.format === "LEAGUE" ? viewStyles.league_registration_pair_name : ""}`)}>
                            <strong>{pair.playerNames.length ? pair.playerNames.join(" / ") : pair.name}</strong>
                          </div>
                          {canRemovePair ? (
                            <form action={removeCategoryPairAction}>
                              <input
                                type="hidden"
                                name="pairId"
                                value={pair.id}
                              />
                              <SubmitButton
                                label="Remover dupla"
                                pendingLabel="Removendo..."
                                className={viewStyles.button_button_danger}
                              />
                            </form>
                          ) : null}
                          {canReplacePairPlayer && availableAthletes.length ? (
                            <div className={viewStyles.stack_xs_league_registration_replacements}>
                              {pair.playerIds.map((playerId, index) => (
                                <SafeActionForm action={replaceCategoryPairPlayerAction} className={viewStyles.inline_pair_edit} successMessage="Atleta substituído." key={`${pair.id}-${playerId}`}>
                                  <input type="hidden" name="pairId" value={pair.id} />
                                  <input type="hidden" name="previousPlayerId" value={playerId} />
                                  <AthleteSearchField id={`replace-${pair.id}-${playerId}`} label={`Substituir ${pair.playerNames[index] ?? "atleta"}`} name="replacementPlayerId" athletes={availableAthletes} compact />
                                  <SubmitButton label="Trocar" pendingLabel="Trocando..." className={viewStyles.button_button_small} />
                                </SafeActionForm>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={viewStyles.muted}>Nenhuma dupla confirmada.</p>
                  )}
                </div>
              </>
            )}

            {category.registrations.length ? (
              <div className="stack-sm">
                <h4>Inscrições recebidas pelo link público</h4>
                <p className={viewStyles.muted}>
                  Nesta etapa, as inscrições públicas permanecem somente para
                  consulta.
                </p>
                <div className={viewStyles.simple_list}>
                  {category.registrations.map((registration) => (
                    <div className={viewStyles.simple_item} key={registration.id}>
                      <div className={viewStyles.match_copy}>
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
