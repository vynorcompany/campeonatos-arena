import { notFound } from "next/navigation";
import { requireModuleView } from "@/lib/auth/guards";
import { arenaDatabase } from "@/lib/arena-database";
import { bookingServicesInclude, bookingServiceRows } from "@/lib/comandas/booking-service";
import { PrintDocument } from "@/components/printing/print-document";
export const dynamic = "force-dynamic";
export default async function PrintComandaPage({ params }: { params: Promise<{ comandaId: string }> }) {
  const auth = await requireModuleView("pos"); const { comandaId } = await params; const db = arenaDatabase(auth.arenaId);
  const [comanda, arena, settings] = await Promise.all([
    db.comanda.findFirst({ where: { id: comandaId, arenaId: auth.arenaId }, select: { code: true, label: true, status: true, openedAt: true, openedByUserName: true, bookingServices: bookingServicesInclude, items: { select: { quantity: true, totalCents: true, product: { select: { name: true } } } } } }),
    db.arena.findUniqueOrThrow({ where: { id: auth.arenaId }, select: { name: true, legalName: true, cnpj: true, address: true, city: true, state: true, phone: true } }),
    db.arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId }, select: { printerPaper: true, printerCopies: true } }),
  ]);
  if (!comanda) notFound(); const services = bookingServiceRows(comanda.bookingServices); const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  return <PrintDocument paper={settings?.printerPaper ?? "80MM"} copies={settings?.printerCopies ?? 1}><header className="tw:text-center"><h2 className="tw:text-base">{arena.name}</h2>{arena.legalName ? <p>{arena.legalName}</p> : null}{arena.cnpj ? <p>CNPJ {arena.cnpj}</p> : null}{arena.address ? <p>{arena.address} · {arena.city}/{arena.state}</p> : null}{arena.phone ? <p>{arena.phone}</p> : null}</header><hr className="tw:border-dashed tw:border-black"/><p>Comanda: {comanda.code}<br/>Cliente: {comanda.label}<br/>Aberta por: {comanda.openedByUserName || "Equipe da arena"}<br/>Situação: {comanda.status === "OPEN" ? "EM ABERTO · NÃO COMPROVA PAGAMENTO" : "ENCERRADA · CONSULTE OS RECEBIMENTOS"}</p><table className="tw:w-full tw:text-left"><thead><tr><th>Item</th><th className="tw:text-right">Valor</th></tr></thead><tbody>{comanda.items.map((item, index) => <tr key={index}><td className="tw:py-1">{item.quantity}× {item.product.name}</td><td className="tw:py-1 tw:text-right">{money(item.totalCents)}</td></tr>)}{services.map(service => <tr key={service.id}><td className="tw:py-1">{service.name}</td><td className="tw:py-1 tw:text-right">{money(service.amountCents)}</td></tr>)}</tbody></table><p className="tw:border-t tw:border-black tw:pt-2 tw:text-right tw:font-bold">TOTAL {money(comanda.items.reduce((total, item) => total + item.totalCents, 0) + services.reduce((total, service) => total + service.amountCents, 0))}</p></PrintDocument>;
}
