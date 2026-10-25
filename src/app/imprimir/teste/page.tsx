import { requireArenaAccess } from "@/lib/auth/session";
import { arenaDatabase } from "@/lib/arena-database";
import { PrintDocument } from "@/components/printing/print-document";
export const dynamic = "force-dynamic";
export default async function PrinterTestPage() {
  const auth = await requireArenaAccess();
  const settings = await arenaDatabase(auth.arenaId).arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId }, select: { printerPaper: true, printerCopies: true } });
  return <PrintDocument paper={settings?.printerPaper ?? "80MM"} copies={settings?.printerCopies ?? 1}><h2 className="tw:text-center tw:text-base">{auth.arenaName}</h2><p className="tw:text-center tw:font-bold">TESTE DE IMPRESSÃO</p><p>Formato: {settings?.printerPaper ?? "80MM"}</p><p>Data: {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date())}</p><p>ABCDEFGHIJKLMNOPQRSTUVWXYZ<br/>abcdefghijklmnopqrstuvwxyz<br/>0123456789 · R$ 123,45<br/>Acentos: ação, presença, quadra</p><div className="tw:my-4 tw:h-8 tw:border tw:border-black"/><p>Confira alinhamento, margens e legibilidade. Este teste não gera venda, cobrança ou documento fiscal.</p></PrintDocument>;
}
