"use client";

import { useState } from "react";
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

  if (isEditing) {
    return (
      <SafeActionForm action={updateStudentAction} className="entity-edit-form" successMessage="Aluno atualizado.">
        <input type="hidden" name="studentId" value={studentId} />
        <div className="entity-edit-grid">
          <input name="name" type="text" defaultValue={name} aria-label="Nome do aluno" autoFocus />
          <input name="phone" type="text" defaultValue={phone} aria-label="Telefone do aluno" placeholder="Telefone" />
          <input name="email" type="email" defaultValue={email} aria-label="E-mail do aluno" placeholder="E-mail" />
          <input
            name="remainingClasses"
            type="number"
            min="0"
            defaultValue={remainingClasses}
            aria-label="Aulas restantes"
          />
          <input name="notes" type="text" defaultValue={notes} aria-label="ObservaÃ§Ãµes do aluno" placeholder="ObservaÃ§Ãµes" />
        </div>
        <div className="player-inline-actions">
          <SubmitButton label="Salvar" pendingLabel="..." className="player-inline-text-button player-inline-text-button-save" />
          <button type="button" className="player-inline-text-button" onClick={() => setIsEditing(false)}>
            Cancelar
          </button>
        </div>
      </SafeActionForm>
    );
  }

  return (
    <div className="entity-actions-cell">
      <div className="entity-main-text">
        <strong>{name}</strong>
        <span className="table-subtext">
          {linkedPlayerName ? `Vinculado ao jogador ${linkedPlayerName}` : contact}
        </span>
      </div>
      <div className="player-name-tools">
        <button
          type="button"
          className="player-inline-icon-button"
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
            className="player-trash-button"
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

