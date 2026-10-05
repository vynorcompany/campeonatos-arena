"use client";
import { viewStyles } from "./ranking-create-form.utilities";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/forms/submit-button";
import { createRankingProfileAction } from "@/lib/actions/tournament";

export function RankingCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className={viewStyles.grid_form}
      aria-busy={isPending}
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          try {
            const rankingId = await createRankingProfileAction(formData);
            router.push(`/torneios/rankings/${rankingId}`);
          } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : "Não foi possível criar o ranking.");
          }
        });
      }}
    >
      <div className={viewStyles.field}>
        <label htmlFor="ranking-name">Nome do ranking</label>
        <input id="ranking-name" name="name" type="text" placeholder="Ex.: Ranking oficial 2026" required />
      </div>

      <div className={viewStyles.field}>
        <label htmlFor="ranking-type">Tipo do ranking</label>
        <select id="ranking-type" name="type" defaultValue="PAIR">
          <option value="PAIR">Duplas</option>
          <option value="INDIVIDUAL">Individual</option>
        </select>
      </div>

      <div className={viewStyles.field}>
        <label htmlFor="ranking-model">Modelo de pontuação</label>
        <select id="ranking-model" name="model" defaultValue="KNOCKOUT">
          <option value="LEAGUE">Liga</option>
          <option value="KNOCKOUT">Mata-mata</option>
        </select>
      </div>

      <div className={viewStyles.field_form_full}>
        <label htmlFor="ranking-description">Descrição</label>
        <input id="ranking-description" name="description" type="text" placeholder="Use para identificar o formato ou a temporada." />
      </div>

      <div className={viewStyles.form_full_section_actions}>
        <SubmitButton label="Criar ranking" pendingLabel="Criando..." className={viewStyles.button_button_primary} />
      </div>
      {error ? <p className={viewStyles.form_error_form_full} role="alert">{error}</p> : null}
    </form>
  );
}
