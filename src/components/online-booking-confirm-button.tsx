"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmOnlineBookingAction } from "@/lib/actions/calendar";

export function OnlineBookingConfirmButton({ occurrenceId }: { occurrenceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return <span className="agenda-online-confirm-wrap">{error ? <span className="agenda-online-confirm-error" title={error}>!</span> : null}<button type="button" className="agenda-online-confirm-button" aria-label="Confirmar reserva online" title="Confirmar reserva online" disabled={pending} onClick={() => { const formData = new FormData(); formData.set("occurrenceId", occurrenceId); setError(""); startTransition(async () => { try { await confirmOnlineBookingAction(formData); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível confirmar."); } }); }}>{pending ? "…" : "✓"}</button></span>;
}
