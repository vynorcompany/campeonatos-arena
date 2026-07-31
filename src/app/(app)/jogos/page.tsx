import Link from "next/link";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

type GamesPageProps = {
  searchParams?: {
    tournamentId?: string;
    categoryId?: string;
  };
};

export default async function GamesPage({ searchParams }: GamesPageProps) {
  const auth = await requireModuleView("matches");
  const activeTournaments = await prisma.tournament.findMany({
    where: {
      arenaId: auth.arenaId,
      registrationPhase: { not: "FINISHED" },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true },
  });
  const selectedTournament =
    activeTournaments.find(
      (tournament) => tournament.id === searchParams?.tournamentId,
    ) ?? activeTournaments[0];
  const categories = selectedTournament
    ? await prisma.tournamentCategory.findMany({
        where: {
          tournamentId: selectedTournament.id,
          active: true,
        },
        orderBy: { level: "asc" },
        select: { id: true, name: true },
      })
    : [];
  const selectedCategory =
    categories.find((category) => category.id === searchParams?.categoryId) ??
    categories[0];

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Jogos</p>
          <h1>Confrontos e resultados</h1>
          <p className="muted">
            Escolha o evento e a categoria para lançar os placares.
          </p>
        </div>
      </header>

      {!selectedTournament ? (
        <SectionCard title="Nenhum evento em operação">
          <p className="muted">
            Crie um evento e adicione categorias para começar a registrar jogos.
          </p>
          <Link href="/torneios/novo" className="button button-primary">
            Criar evento
          </Link>
        </SectionCard>
      ) : (
        <SectionCard
          title="Selecionar jogos"
          description="Os placares são registrados dentro da categoria escolhida."
        >
          <form method="get" className="grid-form">
            <div className="field">
              <label htmlFor="tournamentId">Evento ativo</label>
              <select
                id="tournamentId"
                name="tournamentId"
                defaultValue={selectedTournament.id}
                aria-label="Selecionar evento"
              >
                {activeTournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="categoryId">Categoria</label>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={selectedCategory?.id ?? ""}
                aria-label="Selecionar categoria"
                disabled={!categories.length}
              >
                {!categories.length ? (
                  <option value="">Nenhuma categoria ativa</option>
                ) : (
                  categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="form-full section-actions">
              <button type="submit" className="button">
                Atualizar seleção
              </button>
              {selectedCategory ? (
                <Link
                  href={`/torneios/${selectedTournament.id}/categorias/${selectedCategory.id}?tab=games`}
                  className="button button-primary"
                >
                  Abrir jogos da categoria
                </Link>
              ) : (
                <Link
                  href={`/torneios/${selectedTournament.id}`}
                  className="button button-primary"
                >
                  Adicionar categoria
                </Link>
              )}
            </div>
          </form>
        </SectionCard>
      )}
    </div>
  );
}
