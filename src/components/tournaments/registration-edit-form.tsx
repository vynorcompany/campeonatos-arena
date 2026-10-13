"use client";

import type { ReactNode } from "react";
import { useFormState } from "react-dom";
import { updateTournamentRegistrationAction, type ActionState } from "@/lib/actions/tournament";

const initialState: ActionState = { error: null, success: null };

export function RegistrationEditForm({ children, className }: { children: ReactNode; className?: string }) {
  const [state, action] = useFormState(updateTournamentRegistrationAction, initialState);

  return <form action={action} className={className}>
    {children}
    {state.error ? <p role="alert" className="tw:col-span-full tw:m-0 tw:rounded-lg tw:bg-red-50 tw:p-3 tw:text-sm tw:text-red-800">{state.error}</p> : null}
    {state.success ? <p role="status" className="tw:col-span-full tw:m-0 tw:rounded-lg tw:bg-emerald-50 tw:p-3 tw:text-sm tw:text-emerald-800">{state.success}</p> : null}
  </form>;
}
