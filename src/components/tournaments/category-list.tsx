import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./category-list.utilities";
import Link from "next/link";
import { EventIcon } from "@/components/tournaments/event-icon";

type CategoryListItem = {
  id: string;
  name: string;
  competition: {
    format: "LEAGUE" | "THREE_GROUPS" | "FOUR_GROUPS" | "SIMPLE";
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
          <p className={viewStyles.muted}>Gerencie as categorias e acompanhe as inscrições.</p>
        </div>
        <Link
          className={viewStyles.button_button_primary}
          href={`/torneios/${tournamentId}/categorias/nova`}
        >
          <span className={viewStyles.category_add_symbol}>＋</span>Adicionar categoria
        </Link>
      </div>

      {categories.length ? (
        <div className={viewStyles.t_category_list}>
          <div className={viewStyles.t_category_table_head}><span>Categoria</span><span>Tipo</span><span>Duplas inscritas</span><span>Status</span><span>Ações</span></div>
          {categories.map((category) => (
            <div className={viewStyles.t_category_row} key={category.id}>
              <span className={viewStyles.t_category_icon}><EventIcon name="users" /></span>
              <div className={viewStyles.t_category_name}><strong>{category.name}</strong><small>{category.competition ? "Categoria configurada" : "Aguardando configuração"}</small></div>
              <span className={viewStyles.t_category_format}>
                {category.competition
                  ? formatLabels[category.competition.format]
                  : "Pendente"}
              </span>
              <span className={viewStyles.t_category_pairs}>
                {category.competition
                  ? `${category.competition.pairCount} duplas`
                  : "—"}
              </span>
              <span className={cx(`${viewStyles.t_category_status} ${category.competition ? "active" : "pending"}`)}>{category.competition ? "Ativa" : "Pendente"}</span>
              <Link
                href={`/torneios/${tournamentId}/categorias/${category.id}`}
                className={viewStyles.t_category_enter}
              >
                Entrar <span aria-hidden="true">›</span>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p className={viewStyles.t_category_empty}>
          Adicione a primeira categoria para iniciar a operação do evento.
        </p>
      )}
    </section>
  );
}
