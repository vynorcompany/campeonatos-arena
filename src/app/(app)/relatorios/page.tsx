import Link from "next/link";
import { requireModuleView } from "@/lib/auth/guards";

const reports = [
  ["Relatório de Caixa", "Movimentações, abertura, sangrias e suprimentos", "caixa"],
  ["Relatório de Lançamentos", "Receitas, despesas, baixas e pendências", "lancamentos"],
  ["Relatórios de Produtos", "Vendas e desempenho do catálogo", "produtos"],
  ["Movimentação de Estoque", "Entradas, saídas e ajustes", "estoque"],
  ["Histórico de Comandas", "Comandas concluídas e seus recebimentos", "comandas"],
  ["DRE Gerencial", "Resultado operacional por período", "dre"],
  ["Relatório de Planos", "Vendas, recorrência e situação de pagamentos", "planos"],
  ["Relatório de Reservas", "Ocupação, horários e reservas da arena", "reservas"],
  ["Pagamentos Online", "Cobranças iniciadas e confirmações automáticas", "pagamentos-online"]
] as const;

export default async function ReportsPage() {
  await requireModuleView("finance");
  return <nav className="settings-submenu-list" aria-label="Relatórios">{reports.map(([label, description, slug]) => <Link href={`/relatorios/${slug}`} key={slug}><span className="settings-submenu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 19V9m7 10V5m7 14v-7" /></svg></span><span><strong>{label}</strong><small>{description}</small></span><svg className="settings-submenu-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></Link>)}</nav>;
}
