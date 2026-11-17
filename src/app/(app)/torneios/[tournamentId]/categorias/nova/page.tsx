import { EventEditorSection } from "@/components/tournaments/event-editor-section";
import { tournamentWorkspace as ui } from "@/components/tournaments/tournament-workspace";
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
  return <main className={viewStyles.tournament_management_page_stack_md}><header className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-end tw:gap-2"><h1 className="tw:sr-only">Nova categoria</h1><Link className={viewStyles.button} href={`/torneios/${tournament.id}`}>Voltar às categorias</Link></header><EventEditorSection title="Inscrição da categoria"><form action={createTournamentCategoryAction} className={viewStyles.grid_form}><input type="hidden" name="tournamentId" value={tournament.id} /><div className={viewStyles.field_form_full}><label htmlFor="category-name">Nome da categoria</label><input id="category-name" name="name" placeholder="Ex.: 5ª Feminina" required autoFocus /></div><label className={ui.field}>Tipo de inscrição<select name="registrationType" defaultValue="PAIR"><option value="PAIR">Dupla · dois atletas</option><option value="INDIVIDUAL">Individual · um atleta, sem jogos</option></select></label><p className="tw:col-span-full tw:m-0 tw:text-xs tw:text-[#465c75]">Individual é indicado para day use e eventos sem gestão de jogos. Duplas e trios são configurados na competição.</p><button className={ui.success} type="submit">Criar e configurar categoria</button></form></EventEditorSection></main>;
}
