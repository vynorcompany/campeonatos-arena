import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CategoryDirectory } from "@/components/tournaments/category-directory";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { canPerformPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function TournamentCategoriesPage(props: { params: Promise<{ tournamentId: string }> }) {
  const params = await props.params;
  const auth = await requireModuleView("tournaments");
  if (!canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) redirect(`/jogos?tournamentId=${encodeURIComponent(params.tournamentId)}`);
  const tournament = await prisma.tournament.findFirst({
    where: { id: params.tournamentId, arenaId: auth.arenaId },
    include: { categories: { orderBy: { level: "asc" }, include: { competition: { select: { format: true, _count: { select: { pairs: { where: { active: true } } } } } } } } },
  });
  if (!tournament) notFound();

  return <main className={ui.page}>
    <header className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-end tw:gap-2"><h1 className="tw:sr-only">Categorias</h1><Link href={`/torneios/${tournament.id}`} className={viewStyles.button}>Voltar ao torneio</Link></header>
    <section className="tw:min-w-0"><CategoryDirectory tournamentId={tournament.id} categories={tournament.categories.map((category) => ({ id: category.id, name: category.name, competition: category.competition ? { format: category.competition.format, pairCount: category.competition._count.pairs } : null }))} /></section>
  </main>;
}
