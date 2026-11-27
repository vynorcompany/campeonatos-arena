import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CategoryDirectory } from "@/components/tournaments/category-directory";
import { tournamentWorkspace as ui } from "@/components/tournaments/tournament-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { canPerformPermission } from "@/lib/permissions";
import { getTournamentCategories } from "@/lib/tournaments/workspaces";

export default async function TournamentCategoriesPage(props: { params: Promise<{ tournamentId: string }> }) {
  const params = await props.params;
  const auth = await requireModuleView("tournaments");
  if (!canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) redirect(`/jogos?tournamentId=${encodeURIComponent(params.tournamentId)}`);
  const { tournament, categories } = await getTournamentCategories(params.tournamentId);
  if (!tournament) notFound();

  return <main className={ui.page}>
    <header className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-end tw:gap-2"><h1 className="tw:sr-only">Categorias</h1><Link href={`/torneios/${tournament.id}`} className={viewStyles.button}>Voltar ao torneio</Link></header>
    <section className="tw:min-w-0"><CategoryDirectory tournamentId={tournament.id} categories={categories} /></section>
  </main>;
}
