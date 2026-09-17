import { OperationalSubmenuList } from "@/components/operational-submenu-list";
import { requireModuleView } from "@/lib/auth/guards";

const reports = [
  ["Relatório de Caixa", "Movimentações, abertura, sangrias e suprimentos", "caixa"], ["Relatório de Lançamentos", "Receitas, despesas, baixas e pendências", "lancamentos"], ["Relatórios de Produtos", "Vendas e desempenho do catálogo", "produtos"], ["Movimentação de Estoque", "Entradas, saídas e ajustes", "estoque"], ["Histórico de Comandas", "Comandas concluídas e seus recebimentos", "comandas"], ["DRE Gerencial", "Resultado operacional por período", "dre"], ["Relatório de Planos", "Vendas, recorrência e situação de pagamentos", "planos"], ["Relatório de Reservas", "Ocupação, horários e reservas da arena", "reservas"], ["Pagamentos Online", "Cobranças iniciadas e confirmações automáticas", "pagamentos-online"]
] as const;

export default async function ReportsPage() {
  await requireModuleView("finance");
  return <OperationalSubmenuList ariaLabel="Relatórios" items={reports.map(([label, description, slug]) => ({ label, description, href: `/relatorios/${slug}` }))} />;
}
