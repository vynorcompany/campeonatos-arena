import { CRT_OPTIONS, UF_OPTIONS } from "@/lib/fiscal/product-profile";
import Link from "next/link";
import { WorkspaceHeading } from "@/components/ui/workspace-heading";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { updateFiscalSettingsAction } from "@/lib/actions/finance";

type Settings = { crt?: string; issuerState?: string; provider: string; environment: string; series: string; nextNumber: number; notes: string };
export function FiscalSettingsForm({ settings }: { settings: Settings | null }) {
  return <section className={ui.page}>
    <WorkspaceHeading title="Configurações fiscais"><Link href="/financeiro/notas-fiscais" className={ui.secondary}>Notas fiscais</Link></WorkspaceHeading>
    <SafeActionForm action={updateFiscalSettingsAction} successMessage="Configuração fiscal salva." className={`${ui.panel} tw:grid tw:grid-cols-[repeat(2,minmax(0,1fr))] tw:gap-4 tw:viewport-620:grid-cols-1`}>
      <label className={ui.field}>UF do emitente<select name="issuerState" defaultValue={settings?.issuerState ?? ""}><option value="">Selecione</option>{UF_OPTIONS.map(uf=><option key={uf}>{uf}</option>)}</select></label>
      <label className={ui.field}>Regime tributário · CRT<select name="crt" defaultValue={settings?.crt ?? ""}><option value="">Selecione</option>{CRT_OPTIONS.map(([value,label])=><option key={value} value={value}>{value} · {value==="2"?"Simples (excesso de sublimite)":label}</option>)}</select></label>
      <label className={ui.field}>Modo de emissão<select name="provider" defaultValue={settings?.provider ?? "NONE"}><option value="NONE">Desativado</option><option value="MANUAL">Registro manual</option></select></label>
      <label className={ui.field}>Ambiente<select name="environment" defaultValue={settings?.environment ?? "SANDBOX"}><option value="SANDBOX">Testes</option><option value="PRODUCTION">Produção</option></select></label>
      <p className="tw:col-span-full tw:m-0 tw:border-l-2 tw:border-[#1e5ea8] tw:pl-3 tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]">O registro manual organiza os documentos internos; ele não emite notas autorizadas pela SEFAZ.</p>
      <label className={ui.field}>Série<input name="series" defaultValue={settings?.series ?? ""} maxLength={20} placeholder="Ex.: 1" /></label>
      <label className={ui.field}>Próximo número<input name="nextNumber" type="number" inputMode="numeric" min="1" max="999999999" step="1" required defaultValue={settings?.nextNumber ?? 1} /></label>
      <label className={`${ui.field} tw:col-span-full`}>Observações<textarea name="notes" rows={3} defaultValue={settings?.notes ?? ""} className="tw:w-full tw:min-w-0 tw:resize-y tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-white tw:p-3 tw:text-sm" /></label>
      <footer className="tw:col-span-full tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-4"><SubmitButton label="Salvar configurações" pendingLabel="Salvando..." className={ui.primary} /></footer>
    </SafeActionForm>
  </section>;
}
