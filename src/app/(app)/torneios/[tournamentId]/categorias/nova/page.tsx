import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { createTournamentCategoryAction } from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { canPerformPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

export default async function NewTournamentCategoryPage(props: { params: Promise<{ tournamentId: string }> }) {
  const params = await props.params;
  const auth = await requireModuleView("tournaments");
  if (!canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) redirect(`/jogos?tournamentId=${encodeURIComponent(params.tournamentId)}`);
  const tournament = await prisma.tournament.findFirst({ where: { id: params.tournamentId, arenaId: auth.arenaId }, select: { id: true, name: true } });
  if (!tournament) notFound();
  return <main className={viewStyles.tournament_management_page_stack_md}><header className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-end tw:gap-2"><h1 className="tw:sr-only">Nova categoria</h1><Link className={viewStyles.button} href={`/torneios/${tournament.id}`}>Voltar às categorias</Link></header><section className={viewStyles.section_card}><form action={createTournamentCategoryAction} className={viewStyles.grid_form}><input type="hidden" name="tournamentId" value={tournament.id} /><div className={viewStyles.field_form_full}><label htmlFor="category-name">Nome da categoria</label><input id="category-name" name="name" placeholder="Ex.: 5ª Feminina" required autoFocus /></div><button className={viewStyles.button_button_primary} type="submit">Criar e configurar categoria</button></form></section></main>;
}
