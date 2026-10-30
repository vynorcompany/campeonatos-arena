"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import { sendArenaUserRecoveryAction, type AccountAccessState } from "@/lib/actions/account-access";
import { viewStyles } from "./user-actions-cell.utilities";

const initialState: AccountAccessState = { error: null, success: null };

export function UserRecoveryForm({ userId }: { userId: string }) {
  const [state, action] = useFormState(sendArenaUserRecoveryAction, initialState);
  const [link, setLink] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    setLink(state.invitationUrl ? new URL(state.invitationUrl, window.location.origin).href : "");
    setCopyMessage("");
  }, [state]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopyMessage("Link copiado.");
    } catch {
      setCopyMessage("Selecione o link e copie manualmente.");
    }
  }

  return (
    <form action={action} className="tw:grid tw:min-w-0 tw:gap-2">
      <input type="hidden" name="userId" value={userId} />
      <SubmitButton label="Gerar link de recuperação" pendingLabel="Preparando..." className={`${viewStyles.button} tw:w-fit`} />
      {state.error ? <p role="alert" className="tw:m-0 tw:text-sm tw:text-red-700">{state.error}</p> : null}
      {state.success ? <p role="status" className="tw:m-0 tw:text-sm">{state.success}</p> : null}
      {link ? (
        <div className="tw:grid tw:min-w-0 tw:gap-2">
          <label htmlFor={`recovery-link-${userId}`} className="tw:text-sm">Link de recuperação</label>
          <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:gap-2">
            <input id={`recovery-link-${userId}`} type="text" readOnly value={link} onFocus={(event) => event.currentTarget.select()} className="tw:min-h-10 tw:min-w-0 tw:flex-1 tw:basis-48 tw:rounded-lg tw:border tw:border-[#c7d8ea] tw:bg-white tw:px-3 tw:text-sm" />
            <button type="button" onClick={copyLink} className={viewStyles.button}>Copiar link</button>
          </div>
          {copyMessage ? <p role="status" className="tw:m-0 tw:text-sm">{copyMessage}</p> : null}
        </div>
      ) : null}
    </form>
  );
}
