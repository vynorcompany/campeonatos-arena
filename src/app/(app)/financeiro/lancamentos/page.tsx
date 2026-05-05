import { SectionCard } from "@/components/section-card";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createFinancialEntryAction } from "@/lib/actions/finance";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const paymentLabels: Record<string, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  CASH: "Dinheiro",
  TRANSFER: "Transferência",
  OTHER: "Outro",
  "": "Não informado"
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("pt-BR").format(value) : "Sem data";
}

export default async function EntriesPage() {
  const auth = await requireModuleView("finance");
  const entries = await prisma.financialEntry.findMany({
    where: { arenaId: auth.arenaId },
    orderBy: [{ paidAt: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    take: 60
  });

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Financeiro</p>
          <h1>Lançamentos</h1>
          <p className="muted">Registre custos fixos, contas, compras, receitas avulsas e outras movimentações.</p>
        </div>
      </header>

      <SectionCard title="Novo lançamento" description="Lance receitas e despesas manuais da operação.">
        <SafeActionForm action={createFinancialEntryAction} className="grid-form" resetOnSuccess successMessage="Lançamento salvo.">
          <div className="field">
            <label htmlFor="entry-type">Tipo</label>
            <select id="entry-type" name="type" defaultValue="EXPENSE">
              <option value="EXPENSE">Despesa</option>
              <option value="REVENUE">Receita</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="entry-category">Categoria</label>
            <input id="entry-category" name="category" type="text" placeholder="Ex.: Aluguel, energia, marketing" required />
          </div>
          <div className="field">
            <label htmlFor="entry-description">Descrição</label>
            <input id="entry-description" name="description" type="text" required />
          </div>
          <div className="field">
            <label htmlFor="entry-amount">Valor</label>
            <input id="entry-amount" name="amount" type="text" placeholder="150,00" required />
          </div>
          <div className="field">
            <label htmlFor="entry-status">Status</label>
            <select id="entry-status" name="status" defaultValue="PENDING">
              <option value="PENDING">Em aberto</option>
              <option value="PAID">Pago</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="entry-payment-method">Forma de pagamento</label>
            <input id="entry-payment-method" name="paymentMethod" type="text" placeholder="Pix, cartão, boleto..." />
          </div>
          <div className="field">
            <label htmlFor="entry-due-date">Vencimento</label>
            <input id="entry-due-date" name="dueDate" type="date" />
          </div>
          <div className="field">
            <label htmlFor="entry-paid-at">Pagamento</label>
            <input id="entry-paid-at" name="paidAt" type="date" />
          </div>
          <div className="field form-full">
            <label htmlFor="entry-notes">Observações</label>
            <input id="entry-notes" name="notes" type="text" />
          </div>
          <div className="field field-submit">
            <SubmitButton label="Salvar lançamento" pendingLabel="Salvando..." className="button button-primary" />
          </div>
        </SafeActionForm>
      </SectionCard>

      <SectionCard title="Histórico" description="Últimos lançamentos financeiros.">
        <div className="simple-list">
          {entries.map((entry) => (
            <div className="simple-item" key={entry.id}>
              <strong>{entry.description}</strong>
              <span>
                {entry.type === "REVENUE" ? "Receita" : "Despesa"} - {entry.category} - {formatMoney(entry.amountCents)}
              </span>
              <span>
                {entry.status === "PAID" ? "Pago" : "Em aberto"} - {paymentLabels[entry.paymentMethod] ?? entry.paymentMethod} - {formatDate(entry.paidAt ?? entry.dueDate)}
              </span>
            </div>
          ))}
          {!entries.length ? <p className="muted">Nenhum lançamento financeiro cadastrado.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
