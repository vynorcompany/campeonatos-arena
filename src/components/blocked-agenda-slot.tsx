"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { releaseBlockedAgendaSlotAction } from "@/lib/actions/agenda-operations";

export function BlockedAgendaSlot({ occurrenceId, canRelease, courtName, startsAt }: { occurrenceId: string; canRelease: boolean; courtName: string; startsAt: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  return <div className="tw:flex tw:min-h-20 tw:flex-col tw:items-center tw:justify-center tw:gap-2 tw:p-3 tw:text-center tw:text-red-900">
    <strong className="tw:text-xs tw:font-semibold">Horário Bloqueado</strong>
    {canRelease ? <button type="button" aria-label={`Liberar Horário · ${courtName} · ${startsAt}`} disabled={pending} className="tw:min-h-9 tw:max-w-full tw:rounded-md tw:border tw:border-red-300 tw:bg-white tw:px-3 tw:py-2 tw:text-xs tw:font-semibold tw:text-red-800 tw:hover:bg-red-50 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-red-700 tw:disabled:opacity-50 tw:pointer-coarse:min-h-11" onClick={() => {
      setError(""); const form = new FormData(); form.set("occurrenceId", occurrenceId);
      startTransition(async () => {
        try { const result = await releaseBlockedAgendaSlotAction(form); if (result.error) { setError(result.error); return; } router.refresh(); }
        catch { setError("Não foi possível liberar o horário. Tente novamente."); }
      });
    }}>{pending ? "Liberando…" : "Liberar Horário"}</button> : null}
    {error ? <p role="alert" className="tw:m-0 tw:text-xs">{error}</p> : null}
  </div>;
}
