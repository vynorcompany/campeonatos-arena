"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import { createPlayerAction, type ActionState } from "@/lib/actions/tournament";

const initialState: ActionState = {
  error: null,
  success: null
};

export function PlayerForm() {
  const [state, formAction] = useFormState(createPlayerAction, initialState);

  return (
    <form action={formAction} className="grid-form">
      <div className="field">
        <label htmlFor="name">Nome do atleta</label>
        <input id="name" name="name" type="text" placeholder="Ex.: Pedro Martins" required />
      </div>

      <div className="field">
        <label htmlFor="points">Pontuação inicial</label>
        <input id="points" name="points" type="number" min="0" defaultValue="1000" required />
      </div>

      <div className="field">
        <label htmlFor="class">Classe</label>
        <input id="class" name="class" type="text" placeholder="Ex.: B" />
      </div>

      <div className="field">
        <label htmlFor="gender">Gênero</label>
        <select id="gender" name="gender" defaultValue="">
          <option value="">Não informar</option>
          <option value="Feminino">Feminino</option>
          <option value="Masculino">Masculino</option>
          <option value="Outro">Outro</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="phone">Telefone</label>
        <input id="phone" name="phone" type="tel" required />
      </div>

      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" />
      </div>

      <div className="field">
        <label htmlFor="cpf">CPF</label>
        <input id="cpf" name="cpf" inputMode="numeric" />
      </div>

      <div className="field">
        <label htmlFor="birthDate">Nascimento</label>
        <input id="birthDate" name="birthDate" type="date" />
      </div>

      <div className="field">
        <label htmlFor="photo">Foto do atleta</label>
        <input id="photo" name="photo" type="file" accept="image/png,image/jpeg,image/webp" />
      </div>

      <label className="teacher-role-switch">
        <input name="isTeacher" type="checkbox" />
        <span>É professor</span>
      </label>

      <div className="field field-submit">
        <label className="sr-only" htmlFor="submit-player">
          Cadastrar atleta
        </label>
        <SubmitButton label="Cadastrar atleta" pendingLabel="Salvando..." className="button button-primary" />
      </div>

      {state?.error ? <p className="form-error form-full">{state.error}</p> : null}
      {state?.success ? <p className="form-success form-full">{state.success}</p> : null}
    </form>
  );
}
