import { WorkspaceHeading } from "@/components/ui/workspace-heading";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
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
  return <section className={`${ui.page} tw:max-w-4xl`}><WorkspaceHeading title="Cancelamento e reembolso" />
    <SafeActionForm action={saveCancellationPolicyAction} successMessage="Política salva." className={`${ui.panel} tw:grid tw:gap-4`}>
      <label className="tw:grid tw:gap-2 tw:text-xs tw:font-semibold">Condições de cancelamento e reembolso<textarea name="cancellationPolicy" rows={14} maxLength={12000} defaultValue={settings?.cancellationPolicy ?? ""} className="tw:w-full tw:min-w-0 tw:resize-y tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:p-3 tw:text-xs tw:font-normal tw:leading-relaxed tw:text-[var(--text)]"/><small className="tw:font-normal tw:text-[var(--muted)]">Até 12.000 caracteres.</small></label>
      <label className="tw:flex tw:items-start tw:gap-3 tw:text-xs"><input type="checkbox" name="cancellationPolicyPublished" defaultChecked={settings?.cancellationPolicyPublished ?? false} className="tw:mt-0.5 tw:size-5 tw:shrink-0 tw:accent-[var(--primary)]"/><span>Publicar no Portal e na reserva online</span></label>

      <SubmitButton label="Salvar política" pendingLabel="Salvando..." className={`${ui.primary} tw:justify-self-start`}/>
    </SafeActionForm>
    <div className="tw:flex tw:flex-wrap tw:gap-4 tw:text-xs"><Link href={`/classificacao/${encodeURIComponent(arena.slug)}/cancelamento`} target="_blank" rel="noopener noreferrer">Ver página pública ↗</Link><Link href="/arena">Revisar dados e contatos da empresa ↗</Link></div>
  </section>;
}
