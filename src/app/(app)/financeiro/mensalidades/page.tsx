import { SectionCard } from "@/components/section-card";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createSubscriptionAction, recordPlanPaymentAction } from "@/lib/actions/finance";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

function getReferenceMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default async function MonthlyPaymentsPage() {
  const auth = await requireModuleView("finance");
  const [students, plans, subscriptions] = await Promise.all([
    prisma.student.findMany({
      where: { arenaId: auth.arenaId, active: true },
      orderBy: { name: "asc" }
    }),
    prisma.plan.findMany({
      where: { arenaId: auth.arenaId, active: true },
      orderBy: { name: "asc" }
    }),
    prisma.studentSubscription.findMany({
      where: { arenaId: auth.arenaId, status: "ACTIVE" },
      include: { student: true, plan: true },
      orderBy: { dueDay: "asc" }
    })
  ]);

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Financeiro</p>
          <h1>Mensalidades</h1>
          <p className="muted">Vincule alunos a planos e registre pagamentos mensais.</p>
        </div>
      </header>

      <div className="two-column-grid">
        <SectionCard title="Ativar plano" description="Vincule um aluno a um plano mensal.">
          <SafeActionForm action={createSubscriptionAction} className="grid-form finance-narrow-form" resetOnSuccess successMessage="Plano ativado.">
            <div className="field">
              <label htmlFor="subscription-student">Aluno</label>
              <select id="subscription-student" name="studentId" required defaultValue="">
                <option value="">Selecione o aluno</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="subscription-plan">Plano</label>
              <select id="subscription-plan" name="planId" required defaultValue="">
                <option value="">Selecione o plano</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - {formatMoney(plan.monthlyPriceCents)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="subscription-due-day">Dia de vencimento</label>
              <input id="subscription-due-day" name="dueDay" type="number" min="1" max="31" defaultValue="10" />
            </div>
            <div className="field">
              <label htmlFor="subscription-started-at">Início</label>
              <input id="subscription-started-at" name="startedAt" type="date" />
            </div>
            <div className="field form-full">
              <label htmlFor="subscription-notes">Observações</label>
              <input id="subscription-notes" name="notes" type="text" />
            </div>
            <div className="field field-submit">
              <SubmitButton label="Ativar plano" pendingLabel="Salvando..." className="button button-primary" />
            </div>
          </SafeActionForm>
        </SectionCard>

        <SectionCard title="Registrar pagamento" description="O pagamento entra como receita no financeiro.">
          <SafeActionForm action={recordPlanPaymentAction} className="grid-form finance-narrow-form" resetOnSuccess successMessage="Pagamento registrado.">
            <div className="field form-full">
              <label htmlFor="payment-subscription">Assinatura</label>
              <select id="payment-subscription" name="subscriptionId" required defaultValue="">
                <option value="">Selecione a assinatura</option>
                {subscriptions.map((subscription) => (
                  <option key={subscription.id} value={subscription.id}>
                    {subscription.student.name} - {subscription.plan.name} - {formatMoney(subscription.monthlyPriceCents)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="payment-reference">Mês de referência</label>
              <input id="payment-reference" name="referenceMonth" type="month" defaultValue={getReferenceMonth()} required />
            </div>
            <div className="field">
              <label htmlFor="payment-amount">Valor pago</label>
              <input id="payment-amount" name="amount" type="text" placeholder="Usa o valor do plano se vazio" />
            </div>
            <div className="field">
              <label htmlFor="payment-method">Forma de pagamento</label>
              <select id="payment-method" name="paymentMethod" defaultValue="PIX">
                <option value="PIX">Pix</option>
                <option value="CREDIT_CARD">Cartão de crédito</option>
                <option value="DEBIT_CARD">Cartão de débito</option>
                <option value="CASH">Dinheiro</option>
                <option value="TRANSFER">Transferência</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="payment-paid-at">Data do pagamento</label>
              <input id="payment-paid-at" name="paidAt" type="date" />
            </div>
            <div className="field field-submit">
              <SubmitButton label="Registrar pagamento" pendingLabel="Registrando..." className="button button-primary" />
            </div>
          </SafeActionForm>
        </SectionCard>
      </div>

      <SectionCard title="Assinaturas ativas" description="Alunos com planos ativos.">
        <table className="data-table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Plano</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Aulas</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((subscription) => (
              <tr key={subscription.id}>
                <td>{subscription.student.name}</td>
                <td>{subscription.plan.name}</td>
                <td>{formatMoney(subscription.monthlyPriceCents)}</td>
                <td>Dia {subscription.dueDay}</td>
                <td>{subscription.classesPerMonth} por mês</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
