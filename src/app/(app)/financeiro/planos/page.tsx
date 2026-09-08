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
    include: {
      teacherAssignments: {
        where: { active: true },
        include: { teacher: { select: { name: true } } },
        orderBy: { teacher: { name: "asc" } },
      },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Financeiro</p>
          <h1>Planos padrão</h1>
          <p className="muted">Defina os modelos de frequência e as turmas compatíveis. O preço é configurado no vínculo de cada professor.</p>
        </div>
      </header>

      <SectionCard title="Cadastrar plano padrão" description="Defina o nome e a frequência que os professores poderão vincular aos seus preços.">
        <SafeActionForm action={createPlanAction} className="grid-form" resetOnSuccess successMessage="Plano salvo.">
          <div className="field">
            <label htmlFor="plan-name">Nome do plano</label>
            <input id="plan-name" name="name" type="text" placeholder="Ex.: Mensal 8 aulas" required />
          </div>
          <div className="field">
            <label htmlFor="plan-price">Preço de referência</label>
            <input id="plan-price" name="monthlyPrice" type="text" placeholder="0,00" defaultValue="0,00" required />
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

      <SectionCard title="Planos padrão cadastrados" description="Os professores vinculam estes modelos e definem seu preço mensal individualmente.">
        <div className="simple-list">
          {plans.map((plan) => (
            <div className="simple-item" key={plan.id}>
              <strong>{plan.name}</strong>
              <span>
                {formatMoney(plan.monthlyPriceCents)} por mês - {plan.classesPerMonth} aulas
              </span>
              <span className="plan-owner-tags">
                {plan.teacherAssignments.map(({ teacher }) => (
                  <em className="plan-owner-tag" key={teacher.name}>
                    Professor: {teacher.name}
                  </em>
                ))}
                {!plan.teacherAssignments.length ? (
                  <em className="plan-owner-tag">Sem professor vinculado</em>
                ) : null}
              </span>
            </div>
          ))}
          {!plans.length ? <p className="muted">Nenhum plano cadastrado ainda.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
