import { viewStyles } from "./page.utilities";
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
    <div className={viewStyles.stack_md}>

      <SectionCard title="Cadastrar plano padrão" description="Defina o nome e a frequência que os professores poderão vincular aos seus preços.">
        <SafeActionForm action={createPlanAction} className={viewStyles.grid_form} resetOnSuccess successMessage="Plano salvo.">
          <div className={viewStyles.field}>
            <label htmlFor="plan-name">Nome do plano</label>
            <input id="plan-name" name="name" type="text" placeholder="Ex.: Mensal 8 aulas" required />
          </div>
          <div className={viewStyles.field}>
            <label htmlFor="plan-price">Preço de referência</label>
            <input id="plan-price" name="monthlyPrice" type="text" placeholder="0,00" defaultValue="0,00" required />
          </div>
          <div className={viewStyles.field}>
            <label htmlFor="plan-classes">Aulas por mês</label>
            <input id="plan-classes" name="classesPerMonth" type="number" min="0" defaultValue="0" />
          </div>
          <div className={viewStyles.field_form_full}>
            <label htmlFor="plan-notes">Observações</label>
            <input id="plan-notes" name="notes" type="text" placeholder="Regras, benefícios ou restrições do plano." />
          </div>
          <div className={viewStyles.field_field_submit}>
            <SubmitButton label="Cadastrar plano" pendingLabel="Salvando..." className={viewStyles.button_button_primary} />
          </div>
        </SafeActionForm>
      </SectionCard>

      <SectionCard title="Planos padrão cadastrados" description="Os professores vinculam estes modelos e definem seu preço mensal individualmente.">
        <div className={viewStyles.simple_list}>
          {plans.map((plan) => (
            <div className={viewStyles.simple_item} key={plan.id}>
              <strong>{plan.name}</strong>
              <span>
                {formatMoney(plan.monthlyPriceCents)} por mês - {plan.classesPerMonth} aulas
              </span>
              <span className={viewStyles.plan_owner_tags}>
                {plan.teacherAssignments.map(({ teacher }) => (
                  <em className={viewStyles.plan_owner_tag} key={teacher.name}>
                    Professor: {teacher.name}
                  </em>
                ))}
                {!plan.teacherAssignments.length ? (
                  <em className={viewStyles.plan_owner_tag}>Sem professor vinculado</em>
                ) : null}
              </span>
            </div>
          ))}
          {!plans.length ? <p className={viewStyles.muted}>Nenhum plano cadastrado ainda.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
