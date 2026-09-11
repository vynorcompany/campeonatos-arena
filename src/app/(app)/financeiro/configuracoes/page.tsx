import Link from "next/link";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";

const settings = [
  ["Categorias Financeiras", "categorias-financeiras"],
  ["Categorias de Produtos", "categorias-produtos"],
  ["Conectores de pagamento", "pagamentos-online"],
  ["Contas Bancárias", "contas-bancarias"],
  ["Cupons", "cupons"],
  ["Fornecedores", "fornecedores"],
  ["Formas de Pagamentos", "formas-pagamento"],
  ["Notas Fiscais", "notas-fiscais"]
] as const;

export default async function FinancialSettingsPage() {
  await requireModuleView("finance");
  return <div className="stack-md"><SectionCard title="Configurações Financeiras" description="Organize os cadastros que sustentam as rotinas do financeiro."><div className="finance-shortcut-grid">{settings.map(([label, slug]) => <Link className="finance-shortcut" href={`/financeiro/configuracoes/${slug}`} key={slug}><strong>{label}</strong><span>Acessar configuração</span></Link>)}</div></SectionCard></div>;
}
