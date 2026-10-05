import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { RankingCreateForm } from "@/components/forms/ranking-create-form";
import { requireModuleView } from "@/lib/auth/guards";

export default async function NewRankingPage() {
  await requireModuleView("tournaments");

  return (
    <div className={viewStyles.stack_md}>
      <header className={viewStyles.page_header}>
        <Link href="/torneios/rankings" className={viewStyles.button}>Voltar aos rankings</Link>
      </header>

      <RankingCreateForm />
    </div>
  );
}
