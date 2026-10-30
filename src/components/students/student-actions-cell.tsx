"use client";

import { viewStyles } from "./student-actions-cell.utilities";
import { useCallback, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { deleteStudentAction, updateStudentAction } from "@/lib/actions/academy";

type StudentActionsCellProps = {
  studentId: string;
  name: string;
  phone: string;
  email: string;
  remainingClasses: number;
  notes: string;
  linkedPlayerName?: string | null;
};

export function StudentActionsCell({
  studentId,
  name,
  phone,
  email,
  remainingClasses,
  notes,
  linkedPlayerName
}: StudentActionsCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const contact = phone || email || "Sem contato";

  const closeEditor = useCallback(() => setIsEditing(false), []);

  return (
    <div className={viewStyles.entity_actions_cell}>
      <Modal open={isEditing} title="Editar aluno" onClose={closeEditor} width="tw:max-w-[640px]">
        <SafeActionForm action={updateStudentAction} className="tw:flex tw:min-h-full tw:min-w-0 tw:flex-col tw:gap-4" successMessage="Aluno atualizado." onSuccess={closeEditor}>
          <input type="hidden" name="studentId" value={studentId} />
          <div className="tw:grid tw:min-w-0 tw:gap-3 tw:sm:grid-cols-2">
            <label className={ui.field}>Nome<input name="name" type="text" defaultValue={name} required /></label>
            <label className={ui.field}>Telefone<input name="phone" type="tel" defaultValue={phone} autoComplete="tel" /></label>
            <label className={ui.field}>E-mail<input name="email" type="email" defaultValue={email} autoComplete="email" /></label>
            <label className={ui.field}>Aulas restantes<input name="remainingClasses" type="number" min="0" defaultValue={remainingClasses} /></label>
            <label className={`${ui.field} tw:col-span-full`}>Observações<textarea name="notes" defaultValue={notes} rows={4} /></label>
          </div>
          <footer className="tw:mt-auto tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3">
            <button type="button" className={ui.secondary} onClick={closeEditor}>Cancelar</button>
            <SubmitButton label="Salvar aluno" pendingLabel="Salvando..." className={ui.primary} />
          </footer>
        </SafeActionForm>
      </Modal>
      <div className={viewStyles.entity_main_text}>
        <strong>{name}</strong>
        <span className={viewStyles.table_subtext}>
          {linkedPlayerName ? `Vinculado ao jogador ${linkedPlayerName}` : contact}
        </span>
      </div>
      <div className={viewStyles.player_name_tools}>
        <button
          type="button"
          className={viewStyles.player_inline_icon_button}
          onClick={() => setIsEditing(true)}
          aria-label={`Editar ${name}`}
          title="Editar aluno"
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M3.75 14.4V16.25H5.6L14.12 7.73L12.27 5.88L3.75 14.4Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M11.62 6.53L13.47 8.38"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <SafeActionForm
          action={deleteStudentAction}
          successMessage="Aluno removido."
          confirmKeyword="EXCLUIR"
          confirmPrompt={`Digite EXCLUIR para remover ${name} da lista de alunos.`}
        >
          <input type="hidden" name="studentId" value={studentId} />
          <button
            type="submit"
            className={viewStyles.player_trash_button}
            aria-label={`Excluir ${name}`}
            title="Excluir aluno"
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4.75 5.75H15.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path
                d="M7.25 5.75V4.9C7.25 4.28 7.75 3.78 8.37 3.78H11.63C12.25 3.78 12.75 4.28 12.75 4.9V5.75"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6.35 7.35V14.2C6.35 15.06 7.04 15.75 7.9 15.75H12.1C12.96 15.75 13.65 15.06 13.65 14.2V7.35"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M8.7 8.95V12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M11.3 8.95V12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </SafeActionForm>
      </div>
    </div>
  );
}

