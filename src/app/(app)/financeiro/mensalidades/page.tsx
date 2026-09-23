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

function renewalDate(startedAt: Date) {
  return new Date(startedAt.getFullYear() + 1, startedAt.getMonth(), startedAt.getDate());
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
  const today = new Date();
  const renewalLimit = new Date(today); renewalLimit.setDate(renewalLimit.getDate() + 30);
  const renewals = subscriptions.map((subscription) => ({ ...subscription, renewAt: renewalDate(subscription.startedAt) })).filter((subscription) => subscription.renewAt <= renewalLimit).sort((left, right) => left.renewAt.getTime() - right.renewAt.getTime());

  return (
    <div className="stack-md">

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
            <div className="field">
              <label htmlFor="payment-fiscal-document">Documento fiscal</label>
              <select id="payment-fiscal-document" name="fiscalDocumentType" defaultValue="">
                <option value="">Não emitir agora</option>
                <option value="NFS_E">Emitir nota de serviço</option>
                <option value="NFC_E">Emitir cupom fiscal</option>
              </select>
            </div>
            <div className="field field-submit">
              <SubmitButton label="Registrar pagamento" pendingLabel="Registrando..." className="button button-primary" />
            </div>
          </SafeActionForm>
        </SectionCard>
      </div>

      <SectionCard title="Renovações de planos" description="Acompanhe os alunos cujo ciclo de 12 mensalidades está terminando. A renovação é sempre manual, evitando novas cobranças sem aprovação.">
        {renewals.length ? <div className="simple-list settings-compact-list">{renewals.map((subscription) => <div className="simple-item" key={subscription.id}><strong>{subscription.student.name} · {subscription.plan.name}</strong><span>Renovação em {new Intl.DateTimeFormat("pt-BR").format(subscription.renewAt)} · {subscription.renewAt < today ? "renovação pendente" : "renovação próxima"}</span><small>Use “Ativar plano” para renovar o aluno, mantendo o novo ciclo registrado.</small></div>)}</div> : <p className="muted">Nenhuma renovação necessária nos próximos 30 dias.</p>}
      </SectionCard>

      <SectionCard title="Assinaturas ativas" description="Alunos com planos ativos.">
        <table className="data-table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Plano</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Aulas</th>
              <th>Ciclo</th>
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
                <td>{new Intl.DateTimeFormat("pt-BR").format(renewalDate(subscription.startedAt))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
