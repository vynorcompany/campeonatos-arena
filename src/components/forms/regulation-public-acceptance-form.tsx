"use client";

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
    <form action={formAction} className="regulation-public-acceptance">
      <input type="hidden" name="regulationDocumentId" value={regulationDocumentId} />

      <label className={`regulation-accept-box${accepted ? " regulation-accept-box-checked" : ""}`} htmlFor="regulation-accepted">
        <span className="regulation-accept-box-icon" aria-hidden="true">
          <input
            id="regulation-accepted"
            name="accepted"
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.currentTarget.checked)}
          />
        </span>
        <span className="regulation-accept-box-text">Li e aceito os termos deste regulamento</span>
        <span className="regulation-accept-box-shield" aria-hidden="true">
          ⛨
        </span>
      </label>

      <div className="regulation-public-actions">
        <SubmitButton
          label="Aceitar regulamento"
          pendingLabel="Registrando..."
          className="button button-primary button-block"
          disabled={!accepted}
        />
      </div>

      <p className="regulation-public-helper">
        <span aria-hidden="true">🔒</span>
        O botão será habilitado após o aceite do regulamento.
      </p>

      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {state?.success ? <p className="form-success">{state.success}</p> : null}
    </form>
  );
}
