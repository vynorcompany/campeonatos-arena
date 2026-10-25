import Link from "next/link";
import { requirePermission } from "@/lib/auth/guards";
import { arenaDatabase } from "@/lib/arena-database";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { savePrinterSettingsAction } from "@/lib/actions/printer-settings";
export default async function PrinterSettingsPage() {
  const auth = await requirePermission("arena:settings");
  const settings = await arenaDatabase(auth.arenaId).arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId }, select: { printerPaper: true, printerCopies: true } });
  const control = "tw:min-h-11 tw:w-full tw:rounded-xl tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:px-3 tw:py-2 tw:text-[var(--text)]";
  return <section className="tw:grid tw:max-w-3xl tw:min-w-0 tw:gap-5"><header><h1 className="tw:m-0 tw:text-2xl tw:font-semibold">Impressora</h1><p className="tw:text-sm tw:leading-relaxed tw:text-[var(--muted)]">Imprima comprovantes em impressoras USB ou de rede instaladas neste computador. Compatível com o driver do sistema operacional.</p></header>
    <SafeActionForm action={savePrinterSettingsAction} successMessage="Preferências de impressão salvas." className="tw:grid tw:gap-4 tw:rounded-2xl tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:p-5">
      <div className="tw:grid tw:gap-4 tw:sm:grid-cols-2"><label className="tw:grid tw:gap-2 tw:text-sm tw:font-medium">Formato do comprovante<select name="printerPaper" defaultValue={settings?.printerPaper ?? "80MM"} className={control}><option value="58MM">Térmica · 58 mm</option><option value="80MM">Térmica · 80 mm</option><option value="A4">Papel A4</option></select></label><label className="tw:grid tw:gap-2 tw:text-sm tw:font-medium">Número de vias<select name="printerCopies" defaultValue={settings?.printerCopies ?? 1} className={control}>{[1, 2, 3].map(value => <option key={value} value={value}>{value} {value === 1 ? "via" : "vias"}</option>)}</select></label></div>
      <p className="tw:m-0 tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]">Salve o formato e abra o teste. No diálogo do navegador, escolha a impressora, o mesmo tamanho de papel e desative cabeçalhos e rodapés. Use uma cópia no diálogo, pois as vias já estão no documento.</p><SubmitButton label="Salvar preferências" pendingLabel="Salvando..." className="tw:min-h-11 tw:justify-self-start tw:rounded-xl tw:bg-[var(--primary)] tw:px-5 tw:py-3 tw:text-sm tw:font-semibold tw:text-white" />
    </SafeActionForm>
    <Link href="/imprimir/teste" target="_blank" rel="noopener noreferrer" className="tw:justify-self-start tw:rounded-xl tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:px-5 tw:py-3 tw:text-sm tw:font-semibold tw:text-[var(--text)] tw:no-underline">Abrir página de teste ↗</Link>
    <p className="tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]">O navegador protege a lista de impressoras. A confirmação de saída física depende do equipamento; abrir ou fechar o diálogo não confirma que o papel foi impresso.</p>
  </section>;
}
