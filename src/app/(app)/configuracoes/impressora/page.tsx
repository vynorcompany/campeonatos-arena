import { WorkspaceHeading } from "@/components/ui/workspace-heading";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { UsbPrinters } from "@/components/settings/usb-printers";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/guards";
import { arenaDatabase } from "@/lib/arena-database";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { savePrinterSettingsAction } from "@/lib/actions/printer-settings";
export default async function PrinterSettingsPage() {
  const auth = await requirePermission("arena:settings");
  const settings = await arenaDatabase(auth.arenaId).arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId }, select: { printerPaper: true, printerCopies: true } });
  return <section className={`${ui.page} tw:max-w-4xl`}>
    <WorkspaceHeading title="Impressora">
      <Link href="/imprimir/teste" target="_blank" rel="noopener noreferrer" className={ui.secondary}>Abrir página de teste ↗</Link>
    </WorkspaceHeading>
    <UsbPrinters />
    <SafeActionForm action={savePrinterSettingsAction} successMessage="Preferências de impressão salvas." className={`${ui.panel} tw:grid tw:gap-4`}>

      <div className="tw:grid tw:min-w-0 tw:gap-3 tw:sm:grid-cols-2"><label className={ui.field}>Formato do comprovante<select name="printerPaper" defaultValue={settings?.printerPaper ?? "80MM"}><option value="58MM">Térmica · 58 mm</option><option value="80MM">Térmica · 80 mm</option><option value="A4">Papel A4</option></select></label><label className={ui.field}>Número de vias<select name="printerCopies" defaultValue={settings?.printerCopies ?? 1}>{[1, 2, 3].map(value => <option key={value} value={value}>{value} {value === 1 ? "via" : "vias"}</option>)}</select></label></div>

      <SubmitButton label="Salvar preferências" pendingLabel="Salvando..." className={`${ui.primary} tw:justify-self-start`} />
    </SafeActionForm>
  </section>;
}
