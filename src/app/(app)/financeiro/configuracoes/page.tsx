import Link from "next/link";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";

const settings = [
  ["Notas Fiscais", "notas-fiscais"],
  ["Fornecedores", "fornecedores"],
  ["Categorias de Produtos", "categorias-produtos"],
  ["Formas de Pagamentos", "formas-pagamento"],
  ["Contas Bancárias", "contas-bancarias"],
  ["Cupons", "cupons"],
  ["Categorias Financeiras", "categorias-financeiras"],
  ["Pagamentos Online", "pagamentos-online"]
] as const;

export default async function FinancialSettingsPage() {
  await requireModuleView("finance");
  return <div className="stack-md"><SectionCard title="Configurações Financeiras" description="Organize os cadastros que sustentam as rotinas do financeiro."><div className="finance-shortcut-grid">{settings.map(([label, slug]) => <Link className="finance-shortcut" href={`/financeiro/configuracoes/${slug}`} key={slug}><strong>{label}</strong><span>Acessar configuração</span></Link>)}</div></SectionCard></div>;
}
