"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/forms/submit-button";
import { createTournamentAction, type ActionState } from "@/lib/actions/tournament";
import { parseCategoryListInput, TOURNAMENT_CATEGORY_PRESETS } from "@/lib/tournament-categories";

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
  const [creationMode, setCreationMode] = useState<"PUBLIC" | "MANUAL">("MANUAL");
  const [name, setName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["4ª masculina", "5ª masculina", "6ª masculina", "7ª masculina"]);
  const [customCategory, setCustomCategory] = useState("");
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
  const categoryList = useMemo(() => selectedCategories.join(","), [selectedCategories]);

  const labels = {
    basic: "Informações básicas",
    structure: "Estrutura do torneio",
    pricing: "Inscrições e regras financeiras",
    review: "Revisão"
  } satisfies Record<StepKey, string>;

  function toggleCategory(category: string) {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
    );
  }

  function addCustomCategory() {
    const normalized = customCategory.trim();
    if (!normalized) return;
    if (selectedCategories.includes(normalized)) {
      setCustomCategory("");
      return;
    }
    setSelectedCategories((current) => [...current, normalized]);
    setCustomCategory("");
  }

  function removeCategory(category: string) {
    setSelectedCategories((current) => current.filter((item) => item !== category));
  }

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
          <label htmlFor="creationMode">Modo de criação</label>
          <select
            id="creationMode"
            value={creationMode}
            onChange={(event) => setCreationMode(event.target.value as "PUBLIC" | "MANUAL")}
          >
            <option value="MANUAL">Sem inscrições (modo antigo da arena)</option>
            <option value="PUBLIC">Via inscrições públicas</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="name">Nome do torneio</label>
          <input id="name" name="name" required placeholder="Ex.: Super 12 de Julho" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="description">Descrição / Regras</label>
          <textarea id="description" name="description" rows={4} placeholder="Informe regras e instruções para atletas." />
        </div>
        {creationMode === "PUBLIC" ? (
          <div className="field">
            <label htmlFor="publicSlug">Link público de inscrição</label>
            <input id="publicSlug" name="publicSlug" value={publicSlug} readOnly />
          </div>
        ) : null}
        <input type="hidden" name="publicSlug" value={publicSlug} />
        <input type="hidden" name="creationMode" value={creationMode} />
        <input type="hidden" name="registrationPhase" value={creationMode === "PUBLIC" ? "REGISTRATIONS" : "EDITING"} />
      </section>

      <section className="stack-sm" hidden={step !== "structure"}>
        <input type="hidden" id="groupCount" name="groupCount" value="4" />
        <input type="hidden" id="pairsPerGroup" name="pairsPerGroup" value="3" />
        <div className="field">
          <label htmlFor="maxCategoryGap">Diferença máxima entre categorias</label>
          <select id="maxCategoryGap" name="maxCategoryGap" defaultValue="1">
            <option value="1">1 nível</option>
            <option value="2">2 níveis</option>
            <option value="3">3 níveis</option>
          </select>
        </div>
        <div className="field">
          <label>Categorias do torneio</label>
          <div className="stack-xs">
            <div className="simple-grid simple-grid-2">
              {TOURNAMENT_CATEGORY_PRESETS.map((category) => (
                <label key={category} className="category-option">
                  <input type="checkbox" checked={selectedCategories.includes(category)} onChange={() => toggleCategory(category)} />
                  <span>{category}</span>
                </label>
              ))}
            </div>
            <div className="field-inline">
              <input
                value={customCategory}
                onChange={(event) => setCustomCategory(event.target.value)}
                placeholder="Adicionar categoria personalizada"
              />
              <button type="button" className="button" onClick={addCustomCategory}>Adicionar</button>
            </div>
            <div className="field-inline" style={{ flexWrap: "wrap", gap: "8px" }}>
              {selectedCategories.map((category) => (
                <button key={category} type="button" className="button" onClick={() => removeCategory(category)}>
                  {category} ×
                </button>
              ))}
            </div>
          </div>
          <input type="hidden" name="categoryList" value={categoryList} />
        </div>
      </section>

      <section className="stack-sm" hidden={step !== "pricing"}>
        <div className="field">
          <label htmlFor="priceFirstCents">Valor 1ª inscrição</label>
          <input id="priceFirstCents" name="priceFirstCents" defaultValue="70" placeholder="R$ 70" required />
        </div>
        <div className="field">
          <label htmlFor="priceSecondCents">Adicional da 2ª inscrição</label>
          <input id="priceSecondCents" name="priceSecondCents" defaultValue="30" placeholder="R$ 30" required />
        </div>
        <div className="field">
          <label htmlFor="priceThirdCents">Adicional da 3ª inscrição+</label>
          <input id="priceThirdCents" name="priceThirdCents" defaultValue="20" placeholder="R$ 20" required />
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
        <article><strong>Modo</strong><p>{creationMode === "PUBLIC" ? "Via inscrições públicas" : "Sem inscrições (modo antigo)"}</p></article>
        {creationMode === "PUBLIC" ? <article><strong>Link público</strong><p>/inscricao/{publicSlug}</p></article> : null}
        <article><strong>Estrutura</strong><p>Grupos, base por grupo e categorias configuradas nas etapas anteriores.</p></article>
        <article><strong>Valores</strong><p>Valores em R$ por faixa de inscrição.</p></article>
      </section>

      <div className="section-actions">
        {canBack ? <button type="button" className="button" onClick={() => setStep(steps[stepIndex - 1])}>Voltar</button> : null}
        {canNext ? (
          <button
            type="button"
            className="button button-primary"
            onClick={() => setStep(steps[stepIndex + 1])}
            disabled={step === "structure" && !parseCategoryListInput(categoryList).length}
          >
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

