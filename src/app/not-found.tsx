import Link from "next/link";
import { SectionCard } from "@/components/section-card";

export default function NotFound() {
  return (
    <main className="stack-md tw:[min-height:100vh] tw:[padding:1.5rem]">
      <SectionCard title="Página não encontrada" description="O link que você abriu não existe ou não está disponível nesta arena.">
        <p className="eyebrow">Arena Padel</p>
        <div className="section-actions tw:[margin-top:1rem]">
          <Link href="/login" className="button button-primary">
            Ir para o login
          </Link>
          <Link href="/" className="button">
            Voltar ao início
          </Link>
        </div>
      </SectionCard>
    </main>
  );
}
