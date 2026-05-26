"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/forms/submit-button";
import { createTournamentAction, type ActionState } from "@/lib/actions/tournament";

const initialState: ActionState = { error: null, success: null };
const steps = ["basic", "structure", "pricing", "review"] as const;
type StepKey = (typeof steps)[number];

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 42);
}

export function TournamentWizard({ rankings }: { rankings: { id: string; name: string }[] }) {
  const [step, setStep] = useState<StepKey>("basic");
  const [name, setName] = useState("");
  const [state, action] = useFormState(createTournamentAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success && state.tournamentId) {
      router.push(`/torneios/${state.tournamentId}`);
    }
  }, [router, state.success, state.tournamentId]);

  const stepIndex = steps.indexOf(step);
  const canBack = stepIndex > 0;
  const canNext = stepIndex < steps.length - 1;
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);
  const publicSlug = useMemo(() => slugify(name || "torneio"), [name]);

  const labels = {
    basic: "Informações básicas",
    structure: "Estrutura do torneio",
    pricing: "Inscrições e regras financeiras",
    review: "Revisão"
  } satisfies Record<StepKey, string>;

  return (
    <form action={action} className="t-wizard">
      <div className="t-wizard-progress">
        <div className="t-progress-meta">
          <span>Etapa {stepIndex + 1} de {steps.length}</span>
          <strong>{labels[step]}</strong>
        </div>
        <div className="t-progress-bar"><span style={{ width: `${progress}%` }} /></div>
      </div>

      <section className="stack-sm" hidden={step !== "basic"}>
        <div className="field">
          <label htmlFor="name">Nome do torneio</label>
          <input id="name" name="name" required placeholder="Ex.: Super 12 de Julho" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="description">Descrição / Regras</label>
          <textarea id="description" name="description" rows={4} placeholder="Informe regras e instruções para atletas." />
        </div>
        <div className="field">
          <label htmlFor="publicSlug">Link público de inscrição</label>
          <input id="publicSlug" name="publicSlug" value={publicSlug} readOnly />
        </div>
        <input type="hidden" name="registrationPhase" value="REGISTRATIONS" />
      </section>

      <section className="stack-sm" hidden={step !== "structure"}>
        <div className="field">
          <label htmlFor="groupCount">Quantidade de grupos</label>
          <select id="groupCount" name="groupCount" defaultValue="4">
            {Array.from({ length: 8 }).map((_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pairsPerGroup">Base de duplas por grupo</label>
          <select id="pairsPerGroup" name="pairsPerGroup" defaultValue="3">
            {Array.from({ length: 15 }).map((_, index) => <option key={index + 2} value={index + 2}>{index + 2}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="maxCategoryGap">Diferença máxima entre categorias</label>
          <select id="maxCategoryGap" name="maxCategoryGap" defaultValue="1">
            <option value="1">1 nível</option>
            <option value="2">2 níveis</option>
            <option value="3">3 níveis</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="categoryList">Categorias (ordem)</label>
          <input id="categoryList" name="categoryList" defaultValue="1,2,3,4" placeholder="Ex.: 1,2,3,4" required />
        </div>
      </section>

      <section className="stack-sm" hidden={step !== "pricing"}>
        <div className="field">
          <label htmlFor="priceFirstCents">Valor 1ª inscrição</label>
          <input id="priceFirstCents" name="priceFirstCents" defaultValue="70" placeholder="R$ 70" required />
        </div>
        <div className="field">
          <label htmlFor="priceSecondCents">Valor 2ª inscrição</label>
          <input id="priceSecondCents" name="priceSecondCents" defaultValue="100" placeholder="R$ 100" required />
        </div>
        <div className="field">
          <label htmlFor="priceThirdCents">Valor 3ª inscrição+</label>
          <input id="priceThirdCents" name="priceThirdCents" defaultValue="150" placeholder="R$ 150" required />
        </div>
        <div className="field">
          <label htmlFor="rankingId">Ranking vinculado</label>
          <select id="rankingId" name="rankingId" defaultValue="">
            <option value="">Nenhum ranking vinculado</option>
            {rankings.map((ranking) => (
              <option key={ranking.id} value={ranking.id}>{ranking.name}</option>
            ))}
          </select>
        </div>
        <label className="field-inline">
          <input type="checkbox" name="blockCategoryGap" defaultChecked />
          <span>Ativar impedimento por gap de categoria</span>
        </label>
      </section>

      <section className="t-review-grid" hidden={step !== "review"}>
        <article><strong>Nome</strong><p>{name || "Sem nome ainda"}</p></article>
        <article><strong>Link público</strong><p>/inscricao/{publicSlug}</p></article>
        <article><strong>Estrutura</strong><p>Grupos, base por grupo e categorias configuradas nas etapas anteriores.</p></article>
        <article><strong>Valores</strong><p>Valores em R$ por faixa de inscrição.</p></article>
      </section>

      <div className="section-actions">
        {canBack ? <button type="button" className="button" onClick={() => setStep(steps[stepIndex - 1])}>Voltar</button> : null}
        {canNext ? (
          <button type="button" className="button button-primary" onClick={() => setStep(steps[stepIndex + 1])}>
            Próxima etapa
          </button>
        ) : (
          <SubmitButton label="Criar torneio" pendingLabel="Criando..." className="button button-primary" />
        )}
      </div>

      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
    </form>
  );
}

