"use client";

import { useMemo, useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { assignTeacherPlanStudentAction } from "@/lib/actions/academy";

type Client = { id: string; name: string; phone: string };
type Plan = { id: string; name: string };

export function TeacherPlanEnrollmentForm({ teacherId, plans, clients, variant = "default" }: { teacherId: string; plans: Plan[]; clients: Client[]; variant?: "default" | "students" }) {
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const matches = useMemo(() => query.trim().length < 1 ? [] : clients.filter((client) => client.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))).slice(0, 8), [clients, query]);

  return <SafeActionForm action={assignTeacherPlanStudentAction} className={`teacher-enrollment-form ${variant === "students" ? "teacher-enrollment-students" : ""}`} resetOnSuccess successMessage="Aluno inserido e mensalidade recorrente criada.">
    <input type="hidden" name="teacherId" value={teacherId} />
    <input type="hidden" name="planId" value={planId} />
    <input type="hidden" name="clientId" value={clientId} />
    <div className="teacher-enrollment-primary">
      {plans.length > 1 ? <label>Plano<select value={planId} onChange={(event) => setPlanId(event.currentTarget.value)}>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label> : null}
      <label className="teacher-client-search">Pesquisar cliente
        <input value={query} onChange={(event) => { setQuery(event.currentTarget.value); setClientId(""); }} placeholder="Digite o nome do cliente" autoComplete="off" required />
        {matches.length ? <div className="teacher-client-options">{matches.map((client) => <button key={client.id} type="button" onClick={() => { setClientId(client.id); setQuery(client.name); }}><strong>{client.name}</strong><span>{client.phone || "Sem telefone"}</span></button>)}</div> : null}
      </label>
    </div>
    <div className="teacher-enrollment-financial">
      <label>Data de início<input type="date" name="startedAt" required /></label>
      <label>Saldo de aulas<input type="number" name="remainingClasses" min="0" defaultValue="0" required /></label>
      <label>Vencimento<input type="date" name="dueDate" required /></label>
      <label>Desconto<input name="discount" inputMode="decimal" defaultValue="0" /></label>
      <label>Tipo<select name="discountMode" defaultValue="AMOUNT"><option value="AMOUNT">R$</option><option value="PERCENTAGE">%</option></select></label>
      <label>Aplicação<select name="discountApplication" defaultValue="ONE_TIME"><option value="ONE_TIME">Só primeira mensalidade</option><option value="RECURRING">Recorrente</option></select></label>
    </div>
    <SubmitButton label="Inserir aluno" pendingLabel="Inserindo..." className="button button-primary" disabled={!clientId} />
  </SafeActionForm>;
}
