import { notFound, redirect } from "next/navigation";
import { requireModuleView } from "@/lib/auth/guards";

const reports = {
  caixa: ["Relatório de Caixa", "Consolide recebimentos e movimentações do caixa.", "/pdv/caixa"],
  lancamentos: ["Relatório de Lançamentos", "Analise receitas e despesas registradas.", "/financeiro/lancamentos"],
  produtos: ["Relatórios de Produtos", "Acompanhe vendas e giro dos produtos.", "/pdv/vendas"],
  estoque: ["Movimentação de Estoque", "Consulte entradas, saídas e ajustes de mercadorias.", "/pdv/estoque"],
  comandas: ["Histórico de Comandas", "Consulte comandas abertas e finalizadas.", "/comandas"],
  dre: ["DRE Gerencial", "Visualize receitas, custos e resultado operacional.", "/financeiro"],
  planos: ["Relatório de Planos", "Filtre os dados de planos por pacote e professor.", "/financeiro/planos"],
  reservas: ["Relatório de Reservas", "Acompanhe a ocupação e as reservas das quadras.", "/agenda"]
} as const;

export default async function ReportPage({ params }: { params: { relatorio: string } }) {
  await requireModuleView("finance");
  const report = reports[params.relatorio as keyof typeof reports];
  if (!report) notFound();
  redirect(report[2]);
}
