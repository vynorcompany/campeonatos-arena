"use client";
import { useState } from "react";
import { ToggleSwitch } from "@/components/forms/toggle-switch";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { configureCourtCheckinAction } from "@/lib/actions/checkin";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";

export function LessonCheckinPolicyForm({ enabled }: { enabled: boolean }) {
  const [checked, setChecked] = useState(enabled);
  return <SafeActionForm action={configureCourtCheckinAction} successMessage="Regra de check-in de aulas atualizada." className={`${ui.panel} tw:grid tw:min-w-0 tw:gap-3 tw:p-4`}>
    <input type="hidden" name="lessonDebtPolicy" value="true"/><input type="hidden" name="lessonCheckinBlockOverdue" value={String(checked)}/>
    <ToggleSwitch compact tone="blue" label="Exigir acerto de aulas vencidas" checked={checked} onCheckedChange={setChecked}/>
    <p className="tw:m-0 tw:text-xs tw:leading-relaxed tw:text-[#42536a]">Aulas vencidas em aberto exigem acerto no caixa antes da presença. Cobranças futuras não bloqueiam o check-in.</p>
    <div className="tw:border-t tw:border-[var(--line)] tw:pt-3"><SubmitButton label="Salvar regra de aulas" pendingLabel="Salvando…" className={`${ui.primary} tw:font-normal`}/></div>
  </SafeActionForm>;
}
