"use client";
import { useState } from "react";
import { ToggleSwitch } from "@/components/forms/toggle-switch";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { configureCourtCheckinAction } from "@/lib/actions/checkin";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";

export function LessonCheckinPolicyForm({ enabled }: { enabled: boolean }) {
  const [checked, setChecked] = useState(enabled);
  return <SafeActionForm action={configureCourtCheckinAction} successMessage="Regra de check-in de aulas atualizada." className="tw:grid tw:min-w-0 tw:gap-3 tw:rounded-md tw:border tw:border-[#dce7f2] tw:p-3">
    <input type="hidden" name="lessonDebtPolicy" value="true"/><input type="hidden" name="lessonCheckinBlockOverdue" value={String(checked)}/>
    <ToggleSwitch compact tone="blue" label="Exigir acerto de aulas vencidas antes do check-in" checked={checked} onCheckedChange={setChecked}/>
    <p className="tw:m-0 tw:text-xs tw:leading-relaxed tw:text-[#536b86]">Ao tentar fazer check-in, o aluno com aulas vencidas em aberto será orientado a acertar no caixa. Cobranças futuras não impedem a presença.</p>
    <SubmitButton label="Salvar regra de aulas" pendingLabel="Salvando…" className={`${ui.secondary} tw:justify-self-start`}/>
  </SafeActionForm>;
}
