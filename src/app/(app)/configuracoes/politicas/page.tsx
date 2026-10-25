import Link from "next/link";
import { requirePermission } from "@/lib/auth/guards";
import { arenaDatabase } from "@/lib/arena-database";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { saveCancellationPolicyAction } from "@/lib/actions/cancellation-policy";

export default async function ArenaPoliciesPage() {
  const auth = await requirePermission("arena:settings");
  const db = arenaDatabase(auth.arenaId);
  const [arena, settings] = await Promise.all([
    db.arena.findUniqueOrThrow({ where: { id: auth.arenaId }, select: { slug: true } }),
    db.arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId } }),
  ]);
  return <section className="tw:grid tw:max-w-3xl tw:min-w-0 tw:gap-5"><header><p className="tw:mb-1 tw:text-xs tw:font-semibold tw:text-[var(--muted)]">REGRAS DA SUA ARENA</p><h1 className="tw:m-0 tw:text-2xl tw:font-semibold">Cancelamento e reembolso</h1><p className="tw:text-sm tw:leading-relaxed tw:text-[var(--muted)]">Cada arena define suas condições. Informe prazos para reservas e aulas, faltas, chuva, créditos, reembolso e o canal de atendimento.</p></header>
    <SafeActionForm action={saveCancellationPolicyAction} successMessage="Política salva." className="tw:grid tw:gap-5 tw:rounded-2xl tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:p-5">
      <label className="tw:grid tw:gap-2 tw:text-sm tw:font-semibold">Condições de cancelamento e reembolso<textarea name="cancellationPolicy" rows={14} maxLength={12000} defaultValue={settings?.cancellationPolicy ?? ""} className="tw:w-full tw:min-w-0 tw:resize-y tw:rounded-xl tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:p-3 tw:text-sm tw:font-normal tw:leading-relaxed tw:text-[var(--text)]"/><small className="tw:font-normal tw:text-[var(--muted)]">Até 12.000 caracteres. Revise o texto conforme a operação e as obrigações legais da sua arena.</small></label>
      <label className="tw:flex tw:items-start tw:gap-3 tw:text-sm"><input type="checkbox" name="cancellationPolicyPublished" defaultChecked={settings?.cancellationPolicyPublished ?? false} className="tw:mt-0.5 tw:size-5 tw:shrink-0 tw:accent-[var(--primary)]"/><span>Publicar no Portal e na reserva online</span></label>
      <p className="tw:m-0 tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]">A publicação informa as condições aos atletas. Pedidos de reembolso continuam sujeitos à análise da equipe; salvar este texto não dispara cobranças, cancelamentos ou estornos. Direitos legais aplicáveis permanecem preservados.</p>
      <SubmitButton label="Salvar política" pendingLabel="Salvando..." className="tw:min-h-11 tw:justify-self-start tw:rounded-xl tw:bg-[var(--primary)] tw:px-5 tw:py-3 tw:text-sm tw:font-semibold tw:text-white"/>
    </SafeActionForm>
    <div className="tw:flex tw:flex-wrap tw:gap-4 tw:text-sm"><Link href={`/classificacao/${encodeURIComponent(arena.slug)}/cancelamento`} target="_blank" rel="noopener noreferrer">Ver página pública ↗</Link><Link href="/arena">Revisar dados e contatos da empresa ↗</Link></div>
  </section>;
}
