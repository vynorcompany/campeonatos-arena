import { viewStyles } from "./page.utilities";
import { notFound } from "next/navigation";
import { RegulationPublicAcceptanceForm } from "@/components/forms/regulation-public-acceptance-form";
import { prisma } from "@/lib/prisma";

function splitRegulationLines(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default async function PublicRegulationPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
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
    <main className={viewStyles.regulation_public_shell}>
      <aside className={viewStyles.public_reg_aside_reveal_up}>
        <div className={viewStyles.public_reg_brand}>
          {regulation.arena.logoUrl ? (
            <img src={regulation.arena.logoUrl} alt={`Logo da arena ${regulation.arena.name}`} />
          ) : (
            <span>{regulation.arena.name.slice(0, 1)}</span>
          )}
          <strong>{regulation.arena.name}</strong>
        </div>

        <p className={viewStyles.public_reg_kicker}>Regulamento público</p>

        <div className={viewStyles.public_reg_steps}>
          <div className={viewStyles.public_reg_step_public_reg_step_done}>
            <span>1</span>
            <div>
              <strong>Leitura</strong>
              <small>Confira todos os termos antes de continuar</small>
            </div>
          </div>
          <div className={viewStyles.public_reg_step_public_reg_step_active}>
            <span>2</span>
            <div>
              <strong>Aceite</strong>
              <small>Marque a caixa e confirme o regulamento</small>
            </div>
          </div>
        </div>

        <div className={viewStyles.public_reg_status_card}>
          <div className={viewStyles.public_reg_status_icon} aria-hidden="true">
            <span>✓</span>
          </div>
          <div>
            <strong>Leitura concluída</strong>
            <p>Você já leu todos os termos do regulamento.</p>
          </div>
        </div>
      </aside>

      <section className={viewStyles.regulation_public_main_reveal_up}>
        <header className={viewStyles.regulation_public_hero}>
          <div className={viewStyles.stack_xs}>
            <p className={viewStyles.eyebrow}>Regulamento</p>
            <h1>Regulamento</h1>
            <p className={viewStyles.muted}>Leia com atenção e, se estiver de acordo, marque o aceite no final da página.</p>
          </div>

          <div className={viewStyles.public_reg_hero_badge}>
            <span aria-hidden="true">✓</span>
            <div>
              <strong>Leitura concluída</strong>
              <small>Você já conferiu todos os termos</small>
            </div>
          </div>
        </header>

        <article className={viewStyles.regulation_public_content}>
          <div className={viewStyles.regulation_public_content_head}>
            <div className={viewStyles.regulation_public_content_icon} aria-hidden="true">
              <span>▣</span>
            </div>
            <div className={viewStyles.stack_xs}>
              <strong>{title}</strong>
              <span className={viewStyles.muted}>Versão pública publicada pela arena</span>
            </div>
          </div>

          <ol className={viewStyles.regulation_public_list}>
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
