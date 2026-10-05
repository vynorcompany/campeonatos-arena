"use client";
import { viewStyles } from "./regulation-document-form.utilities";

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
    <form action={formAction} className={viewStyles.grid_form}>
      <div className={viewStyles.field_form_full}>
        <label htmlFor="regulation-content">Regulamento</label>
        <textarea
          id="regulation-content"
          name="content"
          rows={16}
          className={viewStyles.regulation_textarea}
          placeholder="Escreva aqui as regras, critérios, prazos, penalidades e demais observações..."
          defaultValue={defaultContent}
          required
        />
      </div>

      <div className={viewStyles.field_field_submit_form_full}>
        <SubmitButton label="Publicar regulamento" pendingLabel="Publicando..." className={viewStyles.button_button_primary} />
      </div>

      {state?.error ? <p className={viewStyles.form_error_form_full}>{state.error}</p> : null}
      {state?.success ? (
        <div className={viewStyles.form_success_form_full_regulation_link_success}>
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
