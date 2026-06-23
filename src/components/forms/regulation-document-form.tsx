"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import { createRegulationDocumentAction, type RegulationActionState } from "@/lib/actions/regulation";

const initialState: RegulationActionState = {
  error: null,
  success: null
};

type RegulationDocumentFormProps = {
  defaultContent?: string;
};

export function RegulationDocumentForm({ defaultContent = "" }: RegulationDocumentFormProps) {
  const [state, formAction] = useFormState(createRegulationDocumentAction, initialState);

  return (
    <form action={formAction} className="grid-form">
      <div className="field form-full">
        <label htmlFor="regulation-content">Regulamento</label>
        <textarea
          id="regulation-content"
          name="content"
          rows={16}
          className="regulation-textarea"
          placeholder="Escreva aqui as regras, critérios, prazos, penalidades e demais observações..."
          defaultValue={defaultContent}
          required
        />
      </div>

      <div className="field field-submit form-full">
        <SubmitButton label="Publicar regulamento" pendingLabel="Publicando..." className="button button-primary" />
      </div>

      {state?.error ? <p className="form-error form-full">{state.error}</p> : null}
      {state?.success ? (
        <div className="form-success form-full regulation-link-success">
          <p>{state.success}</p>
          {state.publicUrl ? (
            <a href={state.publicUrl} target="_blank" rel="noreferrer">
              {state.publicUrl}
            </a>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
