import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TournamentForm } from "@/components/forms/tournament-form";
import { requireModuleView } from "@/lib/auth/guards";
import { canPerformPermission } from "@/lib/permissions";
import { arenaDatabase } from "@/lib/arena-database";

export default async function NewTournamentPage() {
  const auth = await requireModuleView("tournaments");
  if (!canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) redirect("/jogos");
  const rankings = await arenaDatabase(auth.arenaId).rankingProfile.findMany({
    where: {
      arenaId: auth.arenaId,
      type: "INDIVIDUAL",
      model: "KNOCKOUT",
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className={viewStyles.stack_md}>
      <header className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-end tw:gap-2"><h1 className="tw:sr-only">Novo evento</h1><Link href="/torneios" className={viewStyles.button}>
          Voltar
        </Link></header>

      <TournamentForm rankings={rankings} />
    </div>
  );
}
