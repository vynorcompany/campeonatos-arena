
import { RemoveCategoryButton } from "./remove-category-button";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./category-list.utilities";
import Link from "next/link";
import { EventIcon } from "@/components/tournaments/event-icon";

type CategoryListItem = {
  id: string;
  name: string;
  registrationType?: string;
  registrationCount?: number;
  competition: {
    format: "LEAGUE" | "THREE_GROUPS" | "FOUR_GROUPS" | "SIMPLE" | "TRIO";
    pairCount: number;
  } | null;
};

const formatLabels: Record<
  NonNullable<CategoryListItem["competition"]>["format"],
  string
> = {
  LEAGUE: "Liga",
  THREE_GROUPS: "3 grupos",
  FOUR_GROUPS: "4 grupos",
  SIMPLE: "Simples",
  TRIO: "Trio",
};

export function CategoryList({
  tournamentId,
  categories,
}: {
  tournamentId: string;
  categories: CategoryListItem[];
}) {
  return (
    <section className={viewStyles.t_category_index} aria-labelledby="category-list-title">
      <div className={viewStyles.t_category_index_head}>
        <div>
          <h2 id="category-list-title">Categorias do evento</h2>

        </div>
        <Link
          className={viewStyles.button_button_primary}
          href={`/torneios/${tournamentId}/categorias/nova`}
        >
          <svg className={viewStyles.category_add_symbol} viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>Adicionar categoria
        </Link>
      </div>

      {categories.length ? (
        <div className={viewStyles.t_category_list}>
          <div className={viewStyles.t_category_table_head}><span>Categoria</span><span>Tipo</span><span>Inscrições</span><span>Status</span><span>Ações</span></div>
          <>{categories.map((category) => (
            <div className={viewStyles.t_category_row} key={category.id}>

              <div className={viewStyles.t_category_name}><strong>{category.name}</strong></div>
              <span className={viewStyles.t_category_format}>
                {category.registrationType === "INDIVIDUAL" ? "Individual · sem jogos" : category.competition
                  ? formatLabels[category.competition.format]
                  : "Pendente"}
              </span>
              <span className={viewStyles.t_category_pairs}>
                {category.registrationType === "INDIVIDUAL" ? `${category.registrationCount ?? 0} atletas` : category.competition
                  ? `${category.competition.pairCount} ${category.competition.format === "TRIO" ? (category.competition.pairCount === 1 ? "trio" : "trios") : (category.competition.pairCount === 1 ? "dupla" : "duplas")}`
                  : "—"}
              </span>
              <span className={cx(`${viewStyles.t_category_status} ${category.competition ? "active" : "pending"}`)}>{category.registrationType === "INDIVIDUAL" || category.competition ? "Ativa" : "Pendente"}</span>
              <div className="tw:flex tw:items-center tw:justify-end tw:gap-1"><Link
                href={`/torneios/${tournamentId}/categorias/${category.id}`}
                className={viewStyles.t_category_enter}
              >
                Abrir <EventIcon name="chevron" size={14}/>
              </Link><RemoveCategoryButton tournamentId={tournamentId} categoryId={category.id} categoryName={category.name} registrationCount={category.registrationCount ?? 0}/></div>
            </div>
          ))}</>
        </div>
      ) : (
        <p className={viewStyles.t_category_empty}>
          Adicione a primeira categoria para iniciar a operação do evento.
        </p>
      )}
    </section>
  );
}
