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
    <section className="t-category-index" aria-labelledby="category-list-title">
      <div className="t-category-index-head">
        <div>
          <h2 id="category-list-title">Categorias do evento</h2>
          <p className="muted">Gerencie as categorias e acompanhe as inscrições.</p>
        </div>
        <Link
          className="button button-primary"
          href={`/torneios/${tournamentId}?action=categories#acoes-rapidas`}
        >
          <span className="category-add-symbol">＋</span>Adicionar categoria
        </Link>
      </div>

      {categories.length ? (
        <div className="t-category-list">
          <div className="t-category-table-head"><span>Categoria</span><span>Tipo</span><span>Duplas inscritas</span><span>Status</span><span>Ações</span></div>
          {categories.map((category) => (
            <div className="t-category-row" key={category.id}>
              <span className="t-category-icon"><EventIcon name="users" /></span>
              <div className="t-category-name"><strong>{category.name}</strong><small>{category.competition ? "Categoria configurada" : "Aguardando configuração"}</small></div>
              <span className="t-category-format">
                {category.competition
                  ? formatLabels[category.competition.format]
                  : "Pendente"}
              </span>
              <span className="t-category-pairs">
                {category.competition
                  ? `${category.competition.pairCount} duplas`
                  : "—"}
              </span>
              <span className={`t-category-status ${category.competition ? "active" : "pending"}`}>{category.competition ? "Ativa" : "Pendente"}</span>
              <Link
                href={`/torneios/${tournamentId}/categorias/${category.id}`}
                className="t-category-enter"
              >
                Entrar <span aria-hidden="true">›</span>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p className="t-category-empty">
          Adicione a primeira categoria para iniciar a operação do evento.
        </p>
      )}
    </section>
  );
}
