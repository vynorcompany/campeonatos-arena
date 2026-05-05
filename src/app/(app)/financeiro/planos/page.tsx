import { SectionCard } from "@/components/section-card";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createPlanAction } from "@/lib/actions/finance";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default async function FinancePlansPage() {
  const auth = await requireModuleView("finance");
  const plans = await prisma.plan.findMany({
    where: { arenaId: auth.arenaId },
    orderBy: [{ active: "desc" }, { name: "asc" }]
  });

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Financeiro</p>
          <h1>Planos</h1>
          <p className="muted">Cadastre e acompanhe os pacotes mensais vendidos para alunos.</p>
        </div>
      </header>

      <SectionCard title="Cadastrar plano" description="Defina valor mensal, quantidade de aulas e regras do pacote.">
        <SafeActionForm action={createPlanAction} className="grid-form" resetOnSuccess successMessage="Plano salvo.">
          <div className="field">
            <label htmlFor="plan-name">Nome do plano</label>
            <input id="plan-name" name="name" type="text" placeholder="Ex.: Mensal 8 aulas" required />
          </div>
          <div className="field">
            <label htmlFor="plan-price">Valor mensal</label>
            <input id="plan-price" name="monthlyPrice" type="text" placeholder="350,00" required />
          </div>
          <div className="field">
            <label htmlFor="plan-classes">Aulas por mês</label>
            <input id="plan-classes" name="classesPerMonth" type="number" min="0" defaultValue="0" />
          </div>
          <div className="field form-full">
            <label htmlFor="plan-notes">Observações</label>
            <input id="plan-notes" name="notes" type="text" placeholder="Regras, benefícios ou restrições do plano." />
          </div>
          <div className="field field-submit">
            <SubmitButton label="Cadastrar plano" pendingLabel="Salvando..." className="button button-primary" />
          </div>
        </SafeActionForm>
      </SectionCard>

      <SectionCard title="Planos cadastrados" description="Lista de planos disponíveis para assinaturas.">
        <div className="simple-list">
          {plans.map((plan) => (
            <div className="simple-item" key={plan.id}>
              <strong>{plan.name}</strong>
              <span>
                {formatMoney(plan.monthlyPriceCents)} por mês - {plan.classesPerMonth} aulas
              </span>
            </div>
          ))}
          {!plans.length ? <p className="muted">Nenhum plano cadastrado ainda.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
