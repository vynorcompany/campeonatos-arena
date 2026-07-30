import Link from "next/link";

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
          <p className="eyebrow">Categorias</p>
          <h2 id="category-list-title">Categorias do evento</h2>
          <p className="muted">
            Escolha uma categoria para configurar e operar.
          </p>
        </div>
      </div>

      {categories.length ? (
        <div className="t-category-list">
          {categories.map((category) => (
            <div className="t-category-row" key={category.id}>
              <strong>{category.name}</strong>
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
              <Link
                href={`/torneios/${tournamentId}/categorias/${category.id}`}
                className="t-category-enter"
              >
                Entrar <span aria-hidden="true">→</span>
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
