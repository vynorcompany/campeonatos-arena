"use client";
import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { registerCourtCheckinAction } from "@/lib/actions/checkin";

type Participant = { playerId: string; name: string; checkedIn: boolean };
export function GroupCheckinForm({ arenaSlug, token, occurrenceId, courtId, participants, buttonClass }: {
  arenaSlug: string; token: string; occurrenceId: string; courtId: string; participants: Participant[]; buttonClass: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  return <SafeActionForm action={registerCourtCheckinAction} successMessage="Presenças selecionadas confirmadas na grade." onSuccess={() => setSelected([])} className="tw:grid tw:min-w-0 tw:gap-3">
    <input type="hidden" name="arenaSlug" value={arenaSlug}/><input type="hidden" name="token" value={token}/><input type="hidden" name="occurrenceId" value={occurrenceId}/><input type="hidden" name="courtId" value={courtId}/><input type="hidden" name="selectionMode" value="group"/>
    {selected.map(id => <input key={id} type="hidden" name="playerIds" value={id}/>)}
    <fieldset className="tw:m-0 tw:grid tw:min-w-0 tw:gap-2 tw:border-0 tw:p-0"><legend className="tw:mb-2 tw:text-sm">Quem está presente?</legend>{participants.map(p => <label key={p.playerId} className="tw:flex tw:min-w-0 tw:cursor-pointer tw:items-center tw:gap-3 tw:rounded-md tw:border tw:border-white/20 tw:px-3 tw:py-3 tw:text-sm"><input type="checkbox" checked={p.checkedIn || selected.includes(p.playerId)} disabled={p.checkedIn} onChange={e => setSelected(ids => e.target.checked ? [...ids, p.playerId] : ids.filter(id => id !== p.playerId))} className="tw:size-4 tw:shrink-0 tw:accent-[#c5f573]"/><span className="tw:min-w-0 tw:flex-1 tw:break-words">{p.name}</span>{p.checkedIn ? <small className="tw:shrink-0 tw:text-[#d5ff9b]">Confirmado</small> : null}</label>)}</fieldset>
    <SubmitButton label="Confirmar selecionados" pendingLabel="Confirmando..." disabled={!selected.length} className={`${buttonClass} tw:disabled:cursor-default tw:disabled:opacity-50`}/>
  </SafeActionForm>;
}
