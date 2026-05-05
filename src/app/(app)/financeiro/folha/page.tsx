import { SectionCard } from "@/components/section-card";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { upsertPayrollEntryAction } from "@/lib/actions/finance";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

function getReferenceMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function payrollTotal(entry: {
  fixedSalaryCents: number;
  classValueCents: number;
  bonusCents: number;
  discountCents: number;
  teacher: { lessons: { status: string }[] };
}) {
  const completedLessons = entry.teacher.lessons.filter((lesson) => lesson.status === "COMPLETED").length;
  return entry.fixedSalaryCents + completedLessons * entry.classValueCents + entry.bonusCents - entry.discountCents;
}

export default async function PayrollPage() {
  const auth = await requireModuleView("finance");
  const referenceMonth = getReferenceMonth();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [teachers, payrollEntries] = await Promise.all([
    prisma.teacher.findMany({ where: { arenaId: auth.arenaId, active: true }, orderBy: { name: "asc" } }),
    prisma.teacherPayrollEntry.findMany({
      where: { arenaId: auth.arenaId, referenceMonth },
      include: {
        teacher: {
          include: { lessons: { where: { scheduledAt: { gte: start, lt: end } } } }
        }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Financeiro</p>
          <h1>Folha dos professores</h1>
          <p className="muted">Monte salários com fixo, valor por aula, bônus e descontos por mês.</p>
        </div>
      </header>

      <SectionCard title="Salvar folha" description="Ao salvar, uma despesa de folha é criada ou atualizada no financeiro.">
        <SafeActionForm action={upsertPayrollEntryAction} className="grid-form" resetOnSuccess successMessage="Folha salva.">
          <div className="field">
            <label htmlFor="payroll-teacher">Professor</label>
            <select id="payroll-teacher" name="teacherId" required defaultValue="">
              <option value="">Selecione o professor</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="payroll-reference">Mês</label>
            <input id="payroll-reference" name="referenceMonth" type="month" defaultValue={referenceMonth} required />
          </div>
          <div className="field">
            <label htmlFor="payroll-fixed">Salário fixo</label>
            <input id="payroll-fixed" name="fixedSalary" type="text" placeholder="0,00" />
          </div>
          <div className="field">
            <label htmlFor="payroll-class-value">Valor por aula</label>
            <input id="payroll-class-value" name="classValue" type="text" placeholder="0,00" />
          </div>
          <div className="field">
            <label htmlFor="payroll-bonus">Bônus</label>
            <input id="payroll-bonus" name="bonus" type="text" placeholder="0,00" />
          </div>
          <div className="field">
            <label htmlFor="payroll-discount">Descontos</label>
            <input id="payroll-discount" name="discount" type="text" placeholder="0,00" />
          </div>
          <div className="field">
            <label htmlFor="payroll-status">Status</label>
            <select id="payroll-status" name="status" defaultValue="PENDING">
              <option value="PENDING">Em aberto</option>
              <option value="PAID">Pago</option>
            </select>
          </div>
          <div className="field form-full">
            <label htmlFor="payroll-notes">Observações</label>
            <input id="payroll-notes" name="notes" type="text" />
          </div>
          <div className="field field-submit">
            <SubmitButton label="Salvar folha" pendingLabel="Salvando..." className="button button-primary" />
          </div>
        </SafeActionForm>
      </SectionCard>

      <SectionCard title="Folhas do mês" description="Resumo por professor.">
        <div className="teacher-grid">
          {payrollEntries.map((entry) => (
            <article className="teacher-card" key={entry.id}>
              <div className="match-card-top">
                <div>
                  <span className="eyebrow">{entry.status === "PAID" ? "Pago" : "Em aberto"}</span>
                  <h3>{entry.teacher.name}</h3>
                </div>
                <strong>{formatMoney(payrollTotal(entry))}</strong>
              </div>
              <div className="teacher-metrics">
                <span>{entry.teacher.lessons.filter((lesson) => lesson.status === "COMPLETED").length} aulas</span>
                <span>{formatMoney(entry.fixedSalaryCents)} fixo</span>
                <span>{formatMoney(entry.classValueCents)} por aula</span>
              </div>
            </article>
          ))}
          {!payrollEntries.length ? <p className="muted">Nenhuma folha cadastrada para este mês.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
