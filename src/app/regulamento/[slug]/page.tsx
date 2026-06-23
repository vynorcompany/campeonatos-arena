import { notFound } from "next/navigation";
import { RegulationPublicAcceptanceForm } from "@/components/forms/regulation-public-acceptance-form";
import { prisma } from "@/lib/prisma";

function splitRegulationLines(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default async function PublicRegulationPage({ params }: { params: { slug: string } }) {
  const regulation = await prisma.regulationDocument.findUnique({
    where: {
      publicSlug: params.slug
    },
    include: {
      arena: {
        select: {
          name: true,
          logoUrl: true
        }
      }
    }
  });

  if (!regulation || !regulation.active) {
    notFound();
  }

  const lines = splitRegulationLines(regulation.content);
  const title = lines[0]?.replace(/^\d+[\.\)]?\s*/, "") ?? "Regulamento";
  const items = lines.slice(1);

  return (
    <main className="regulation-public-shell">
      <aside className="public-reg-aside reveal-up">
        <div className="public-reg-brand">
          {regulation.arena.logoUrl ? (
            <img src={regulation.arena.logoUrl} alt={`Logo da arena ${regulation.arena.name}`} />
          ) : (
            <span>{regulation.arena.name.slice(0, 1)}</span>
          )}
          <strong>{regulation.arena.name}</strong>
        </div>

        <p className="public-reg-kicker">Regulamento público</p>

        <div className="public-reg-steps">
          <div className="public-reg-step public-reg-step-done">
            <span>1</span>
            <div>
              <strong>Leitura</strong>
              <small>Confira todos os termos antes de continuar</small>
            </div>
          </div>
          <div className="public-reg-step public-reg-step-active">
            <span>2</span>
            <div>
              <strong>Aceite</strong>
              <small>Marque a caixa e confirme o regulamento</small>
            </div>
          </div>
        </div>

        <div className="public-reg-status-card">
          <div className="public-reg-status-icon" aria-hidden="true">
            <span>✓</span>
          </div>
          <div>
            <strong>Leitura concluída</strong>
            <p>Você já leu todos os termos do regulamento.</p>
          </div>
        </div>
      </aside>

      <section className="regulation-public-main reveal-up" style={{ animationDelay: "120ms" }}>
        <header className="regulation-public-hero">
          <div className="stack-xs">
            <p className="eyebrow">Regulamento</p>
            <h1>Regulamento</h1>
            <p className="muted">Leia com atenção e, se estiver de acordo, marque o aceite no final da página.</p>
          </div>

          <div className="public-reg-hero-badge">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>Leitura concluída</strong>
              <small>Você já conferiu todos os termos</small>
            </div>
          </div>
        </header>

        <article className="regulation-public-content">
          <div className="regulation-public-content-head">
            <div className="regulation-public-content-icon" aria-hidden="true">
              <span>▣</span>
            </div>
            <div className="stack-xs">
              <strong>{title}</strong>
              <span className="muted">Versão pública publicada pela arena</span>
            </div>
          </div>

          <ol className="regulation-public-list">
            {items.map((line) => (
              <li key={line}>{line.replace(/^\d+[\.\)]?\s*/, "")}</li>
            ))}
          </ol>
        </article>

        <RegulationPublicAcceptanceForm regulationDocumentId={regulation.id} />
      </section>
    </main>
  );
}
