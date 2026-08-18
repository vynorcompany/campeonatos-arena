import Link from "next/link";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";

const reports = [
  ["Relatório de Caixa", "caixa"], ["Relatório de Lançamentos", "lancamentos"], ["Relatórios de Produtos", "produtos"], ["Movimentação de Estoque", "estoque"], ["Histórico de Comandas", "comandas"], ["DRE Gerencial", "dre"], ["Relatório de Planos", "planos"], ["Relatório de Reservas", "reservas"]
] as const;

export default async function ReportsPage() {
  await requireModuleView("finance");
  return <div className="stack-md"><SectionCard title="Relatórios" description="Acesse os relatórios operacionais e gerenciais da arena."><div className="finance-shortcut-grid">{reports.map(([label, slug]) => <Link className="finance-shortcut" href={`/relatorios/${slug}`} key={slug}><strong>{label}</strong><span>Visualizar relatório</span></Link>)}</div></SectionCard></div>;
}
