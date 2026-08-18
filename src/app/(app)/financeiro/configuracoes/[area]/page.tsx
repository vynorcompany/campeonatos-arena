import Link from "next/link";
import { notFound } from "next/navigation";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import { createFinancialSettingAction } from "@/lib/actions/finance";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

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

function money(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100); }

export default async function FinancialSettingAreaPage({ params }: { params: { area: string } }) {
  const auth = await requireModuleView("finance");
  const item = areas[params.area as keyof typeof areas];
  if (!item) notFound();
  const area = params.area;
  const managed = ["categorias-financeiras", "formas-pagamento", "contas-bancarias", "fornecedores"].includes(area);
  const rows = area === "categorias-financeiras" ? (await prisma.financialCategory.findMany({ where: { arenaId: auth.arenaId }, orderBy: { name: "asc" } })).map((entry) => ({ name: entry.name, detail: entry.type === "BOTH" ? "Receita e despesa" : entry.type === "REVENUE" ? "Receita" : "Despesa" })) : area === "formas-pagamento" ? (await prisma.paymentMethodSetting.findMany({ where: { arenaId: auth.arenaId }, orderBy: { name: "asc" } })).map((entry) => ({ name: entry.name, detail: entry.active ? "Ativa" : "Inativa" })) : area === "contas-bancarias" ? (await prisma.bankAccount.findMany({ where: { arenaId: auth.arenaId }, orderBy: { name: "asc" } })).map((entry) => ({ name: entry.name, detail: `${entry.bankName || "Banco não informado"} · saldo inicial ${money(entry.openingBalanceCents)}` })) : area === "fornecedores" ? (await prisma.supplier.findMany({ where: { arenaId: auth.arenaId }, orderBy: { name: "asc" } })).map((entry) => ({ name: entry.name, detail: [entry.document, entry.phone, entry.email].filter(Boolean).join(" · ") || "Sem contato informado" })) : [];
  return <div className="stack-md"><SectionCard title={item[0]} description={item[1]}>{managed ? <><SafeActionForm action={createFinancialSettingAction} className="grid-form" resetOnSuccess successMessage="Cadastro salvo."><input type="hidden" name="area" value={area} /><div className="field"><label htmlFor="setting-name">Nome</label><input id="setting-name" name="name" required /></div>{area === "categorias-financeiras" ? <div className="field"><label htmlFor="setting-type">Tipo</label><select id="setting-type" name="type" defaultValue="BOTH"><option value="BOTH">Receita e despesa</option><option value="REVENUE">Receita</option><option value="EXPENSE">Despesa</option></select></div> : null}{area === "contas-bancarias" ? <><div className="field"><label htmlFor="setting-bank">Banco</label><input id="setting-bank" name="bankName" /></div><div className="field"><label htmlFor="setting-balance">Saldo inicial</label><input id="setting-balance" name="openingBalance" placeholder="0,00" /></div></> : null}{area === "fornecedores" ? <><div className="field"><label htmlFor="setting-document">CPF/CNPJ</label><input id="setting-document" name="document" /></div><div className="field"><label htmlFor="setting-phone">Telefone</label><input id="setting-phone" name="phone" /></div><div className="field"><label htmlFor="setting-email">E-mail</label><input id="setting-email" name="email" type="email" /></div><div className="field form-full"><label htmlFor="setting-notes">Observações</label><input id="setting-notes" name="notes" /></div></> : null}<div className="field field-submit"><SubmitButton label="Adicionar" pendingLabel="Salvando..." className="button button-primary" /></div></SafeActionForm><div className="simple-list">{rows.map((row) => <div className="simple-item" key={`${row.name}-${row.detail}`}><strong>{row.name}</strong><span>{row.detail}</span></div>)}{!rows.length ? <p className="muted">Nenhum cadastro nesta área.</p> : null}</div></> : <div className="empty-state"><strong>Área preparada para configuração.</strong><span>Os cadastros deste módulo serão centralizados aqui nas próximas etapas do financeiro.</span></div>}<Link className="button" href="/financeiro/configuracoes">Voltar às configurações</Link></SectionCard></div>;
}
