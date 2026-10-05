import { viewStyles } from "./not-found.utilities";
import Link from "next/link";
import { SectionCard } from "@/components/section-card";

export default function NotFound() {
  return (
    <main className={viewStyles.stack_md}>
      <SectionCard title="Página não encontrada" description="O link que você abriu não existe ou não está disponível nesta arena.">
        <p className={viewStyles.eyebrow}>Arena Padel</p>
        <div className={viewStyles.section_actions}>
          <Link href="/login" className={viewStyles.button_button_primary}>
            Ir para o login
          </Link>
          <Link href="/" className={viewStyles.button}>
            Voltar ao início
          </Link>
        </div>
      </SectionCard>
    </main>
  );
}
