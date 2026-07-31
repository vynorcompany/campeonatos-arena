"use client";

import { useState } from "react";

type RankingType = "INDIVIDUAL" | "PAIR";
type RankingModel = "LEAGUE" | "KNOCKOUT";

type RankingTypeFieldProps = {
  id: string;
  defaultType?: RankingType;
};

export function RankingTypeField({
  id,
  defaultType = "PAIR",
}: RankingTypeFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>Tipo do ranking</label>
      <select id={id} name="type" defaultValue={defaultType}>
        <option value="PAIR">Duplas</option>
        <option value="INDIVIDUAL">Individual</option>
      </select>
    </div>
  );
}

type RankingRuleDefaults = {
  championPoints: number;
  runnerUpPoints: number;
  thirdPoints: number;
  semifinalPoints: number;
  quarterfinalPoints: number;
  participationPoints: number;
};

type RankingProfileFieldsProps = {
  idPrefix: string;
  defaultType?: RankingType;
  defaultModel?: RankingModel;
  defaultIsGeneral?: boolean;
  defaultRules?: Partial<RankingRuleDefaults>;
};

const fallbackRules: RankingRuleDefaults = {
  championPoints: 200,
  runnerUpPoints: 140,
  thirdPoints: 90,
  semifinalPoints: 90,
  quarterfinalPoints: 50,
  participationPoints: 20,
};

function RuleInput({
  id,
  name,
  label,
  defaultValue,
}: {
  id: string;
  name: keyof RankingRuleDefaults;
  label: string;
  defaultValue: number;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type="number"
        min="0"
        max="5000"
        defaultValue={defaultValue}
        required
      />
    </div>
  );
}

export function RankingProfileFields({
  idPrefix,
  defaultType = "PAIR",
  defaultModel = "KNOCKOUT",
  defaultIsGeneral = false,
  defaultRules = {},
}: RankingProfileFieldsProps) {
  const [type, setType] = useState<RankingType>(defaultType);
  const [model, setModel] = useState<RankingModel>(defaultModel);
  const [isGeneral, setIsGeneral] = useState(
    defaultIsGeneral && defaultType === "INDIVIDUAL",
  );
  const rules = { ...fallbackRules, ...defaultRules };

  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-type`}>Tipo do ranking</label>
        <select
          id={`${idPrefix}-type`}
          name="type"
          value={type}
          onChange={(event) => {
            const nextType = event.currentTarget.value as RankingType;
            setType(nextType);
            if (nextType !== "INDIVIDUAL") {
              setIsGeneral(false);
            }
          }}
        >
          <option value="PAIR">Duplas</option>
          <option value="INDIVIDUAL">Individual</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-model`}>Modelo de pontuação</label>
        <select
          id={`${idPrefix}-model`}
          name="model"
          value={model}
          onChange={(event) =>
            setModel(event.currentTarget.value as RankingModel)
          }
        >
          <option value="LEAGUE">Liga</option>
          <option value="KNOCKOUT">Mata-mata</option>
        </select>
      </div>

      <label className="field field-inline form-full">
        <input
          name="isGeneral"
          type="checkbox"
          checked={isGeneral}
          disabled={type !== "INDIVIDUAL"}
          onChange={(event) => setIsGeneral(event.currentTarget.checked)}
        />
        <span>
          <strong>Ranking Geral da arena</strong>
          <small>
            Apenas um ranking individual pode ser o Ranking Geral público.
          </small>
        </span>
      </label>

      <RuleInput
        id={`${idPrefix}-champion`}
        name="championPoints"
        label="1º lugar"
        defaultValue={rules.championPoints}
      />
      <RuleInput
        id={`${idPrefix}-runner-up`}
        name="runnerUpPoints"
        label="2º lugar"
        defaultValue={rules.runnerUpPoints}
      />

      {model === "LEAGUE" ? (
        <RuleInput
          id={`${idPrefix}-third`}
          name="thirdPoints"
          label="3º lugar"
          defaultValue={rules.thirdPoints}
        />
      ) : (
        <>
          <RuleInput
            id={`${idPrefix}-semifinal`}
            name="semifinalPoints"
            label="Semifinal"
            defaultValue={rules.semifinalPoints}
          />
          <RuleInput
            id={`${idPrefix}-quarterfinal`}
            name="quarterfinalPoints"
            label="Quartas de final"
            defaultValue={rules.quarterfinalPoints}
          />
        </>
      )}

      <RuleInput
        id={`${idPrefix}-participation`}
        name="participationPoints"
        label="Participação"
        defaultValue={rules.participationPoints}
      />
    </>
  );
}
