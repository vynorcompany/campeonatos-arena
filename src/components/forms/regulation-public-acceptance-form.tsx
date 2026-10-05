"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./regulation-public-acceptance-form.utilities";

import { useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import { acceptRegulationDocumentAction, type RegulationActionState } from "@/lib/actions/regulation";

const initialState: RegulationActionState = {
  error: null,
  success: null
};

type RegulationPublicAcceptanceFormProps = {
  regulationDocumentId: string;
};

export function RegulationPublicAcceptanceForm({ regulationDocumentId }: RegulationPublicAcceptanceFormProps) {
  const [state, formAction] = useFormState(acceptRegulationDocumentAction, initialState);
  const [accepted, setAccepted] = useState(false);

  return (
    <form action={formAction} className={viewStyles.regulation_public_acceptance}>
      <input type="hidden" name="regulationDocumentId" value={regulationDocumentId} />

      <label className={cx(`${viewStyles.regulation_accept_box}${accepted ? " " + viewStyles.regulation_accept_box_checked : ""}`)} htmlFor="regulation-accepted">
        <span className={viewStyles.regulation_accept_box_icon} aria-hidden="true">
          <input
            id="regulation-accepted"
            name="accepted"
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.currentTarget.checked)}
          />
        </span>
        <span className={viewStyles.regulation_accept_box_text}>Li e aceito os termos deste regulamento</span>
        <span className={viewStyles.regulation_accept_box_shield} aria-hidden="true">
          ⛨
        </span>
      </label>

      <div className={viewStyles.regulation_public_actions}>
        <SubmitButton
          label="Aceitar regulamento"
          pendingLabel="Registrando..."
          className={viewStyles.button_button_primary_button_block}
          disabled={!accepted}
        />
      </div>

      <p className={viewStyles.regulation_public_helper}>
        <span aria-hidden="true">🔒</span>
        O botão será habilitado após o aceite do regulamento.
      </p>

      {state?.error ? <p className={viewStyles.form_error}>{state.error}</p> : null}
      {state?.success ? <p className={viewStyles.form_success}>{state.success}</p> : null}
    </form>
  );
}
