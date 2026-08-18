import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";

const areas = {
  "notas-fiscais": ["Notas Fiscais", "Configure a emissão e o acompanhamento de documentos fiscais."],
  fornecedores: ["Fornecedores", "Cadastre parceiros de compra e acompanhe informações de fornecimento."],
  "categorias-produtos": ["Categorias de Produtos", "Agrupe produtos e serviços para facilitar estoque e relatórios."],
  "formas-pagamento": ["Formas de Pagamentos", "Defina os meios aceitos pela arena."],
  "contas-bancarias": ["Contas Bancárias", "Centralize contas e saldos bancários utilizados na operação."],
  cupons: ["Cupons", "Gerencie códigos promocionais e regras de desconto."],
  "categorias-financeiras": ["Categorias Financeiras", "Padronize receitas e despesas para os relatórios gerenciais."],
  "pagamentos-online": ["Pagamentos Online", "Organize as integrações e regras de cobrança digital."]
} as const;

export default async function FinancialSettingAreaPage({ params }: { params: { area: string } }) {
  await requireModuleView("finance");
  const item = areas[params.area as keyof typeof areas];
  if (!item) notFound();
  return <div className="stack-md"><SectionCard title={item[0]} description={item[1]}><div className="empty-state"><strong>Área preparada para configuração.</strong><span>Os cadastros deste módulo serão centralizados aqui nas próximas etapas do financeiro.</span><Link className="button" href="/financeiro/configuracoes">Voltar às configurações</Link></div></SectionCard></div>;
}
