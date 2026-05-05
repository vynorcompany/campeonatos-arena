"use client";

import { useFormState } from "react-dom";
import { registerArenaAction, type RegisterArenaState } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: RegisterArenaState = {
  error: null
};

export function RegisterArenaForm() {
  const [state, formAction] = useFormState(registerArenaAction, initialState);

  return (
    <form action={formAction} className="stack-md">
      <div className="field">
        <label htmlFor="arenaName">Nome da arena</label>
        <input id="arenaName" name="arenaName" type="text" placeholder="Arena Central Padel" required />
      </div>

      <div className="field">
        <label htmlFor="ownerName">Seu nome</label>
        <input id="ownerName" name="ownerName" type="text" placeholder="Nome do responsável" required />
      </div>

      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" placeholder="voce@arena.com" required />
      </div>

      <div className="field">
        <label htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" minLength={10} required />
      </div>

      <div className="field">
        <label htmlFor="confirmPassword">Confirmar senha</label>
        <input id="confirmPassword" name="confirmPassword" type="password" minLength={10} required />
      </div>

      {state?.error ? <p className="form-error">{state.error}</p> : null}

      <SubmitButton label="Cadastrar arena" pendingLabel="Criando..." className="button button-primary button-block" />
    </form>
  );
}
