"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmOnlineBookingAction } from "@/lib/actions/calendar";

export function OnlineBookingConfirmButton({ occurrenceId }: { occurrenceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return <>{error ? <span className="agenda-online-confirm-error" role="alert">{error}</span> : null}<button type="button" className="agenda-confirm-booking-button" disabled={pending} onClick={() => { const formData = new FormData(); formData.set("occurrenceId", occurrenceId); setError(""); startTransition(async () => { try { await confirmOnlineBookingAction(formData); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível confirmar."); } }); }}>{pending ? "Confirmando..." : "Confirmar reserva"}</button></>;
}
