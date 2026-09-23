import Link from "next/link";
import { RankingCreateForm } from "@/components/forms/ranking-create-form";
import { requireModuleView } from "@/lib/auth/guards";

export default async function NewRankingPage() {
  await requireModuleView("tournaments");

  return (
    <div className="stack-md">
      <header className="page-header">
        <Link href="/torneios/rankings" className="button">Voltar aos rankings</Link>
      </header>

      <RankingCreateForm />
    </div>
  );
}
