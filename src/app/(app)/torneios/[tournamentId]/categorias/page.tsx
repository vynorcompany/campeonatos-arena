import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryList } from "@/components/tournaments/category-list";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function TournamentCategoriesPage({ params }: { params: { tournamentId: string } }) {
  const auth = await requireModuleView("tournaments");
  const tournament = await prisma.tournament.findFirst({
    where: { id: params.tournamentId, arenaId: auth.arenaId },
    include: { categories: { orderBy: { level: "asc" }, include: { competition: { select: { format: true, _count: { select: { pairs: true } } } } } } },
  });
  if (!tournament) notFound();

  return <main className="tournament-management-page stack-md">
    <header className="page-header tournament-management-header">
      <div><p className="eyebrow">Torneio</p><h1>Categorias</h1><p className="muted">{tournament.name} · selecione uma categoria para configurar preços, vagas, vínculos e disponibilidade.</p></div>
      <Link href={`/torneios/${tournament.id}`} className="button">Voltar ao torneio</Link>
    </header>
    <section className="section-card tournament-category-management-page"><CategoryList tournamentId={tournament.id} categories={tournament.categories.map((category) => ({ id: category.id, name: category.name, competition: category.competition ? { format: category.competition.format, pairCount: category.competition._count.pairs } : null }))} /></section>
  </main>;
}
