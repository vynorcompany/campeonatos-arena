"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { updateProductFiscalProfileAction } from "@/lib/actions/product-fiscal";
import {
  CONTRIBUTION_CST_OPTIONS,
  CRT_OPTIONS,
  CSOSN_OPTIONS,
  CST_OPTIONS,
  fiscalProfilePending,
  meiCsosnOptions,
  readProductFiscalProfile,
  type FiscalIssuer,
  type ProductFiscalProfile,
} from "@/lib/fiscal/product-profile";
type CatalogRow = { code: string; label: string; cst?: string };
const grid =
  "tw:grid tw:min-w-0 tw:items-start tw:grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] tw:gap-3";
const group =
  "tw:m-0 tw:min-w-0 tw:rounded-lg tw:border tw:border-[var(--line)] tw:p-3";
const shortTaxLabels: Record<string, string> = {
  "00": "Integral",
  "20": "Redução de base",
  "40": "Isenta",
  "41": "Não tributada",
  "60": "ST anterior",
  "90": "Outros",
  "102": "Tributada, sem crédito",
  "103": "Isenção por receita",
  "300": "Imune",
  "400": "Não tributada",
  "500": "ST/antecipação anterior",
  "900": "Outros",
  "01": "Tributável · básica",
  "02": "Tributável · diferenciada",
  "03": "Por unidade",
  "04": "Revenda monofásica",
  "05": "Substituição tributária",
  "06": "Alíquota zero",
  "07": "Isenta",
  "08": "Sem incidência",
  "09": "Suspensão",
};
const legend = "tw:px-1 tw:text-xs tw:font-medium tw:text-[#174983]";
function CatalogField({
  label,
  kind,
  value,
  onChange,
  disabled,
}: {
  label: string;
  kind: "ncm" | "rtc";
  value: string;
  onChange: (value: string, row?: CatalogRow) => void;
  disabled: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false),
    [rows, setRows] = useState<CatalogRow[]>([]),
    [selectedLabel, setSelectedLabel] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (value.length < 2) {
      setRows([]);
      setSelectedLabel("");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/fiscal/catalog?kind=${kind}&q=${encodeURIComponent(value)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error();
        const data = await response.json();
        setRows(data.rows);
        setSelectedLabel(
          data.rows.find((row: CatalogRow) => row.code === value)?.label ?? "",
        );
        setError("");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          setError("Consulta indisponível. Tente novamente.");
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, kind]);
  function choose(row: CatalogRow) {
    onChange(row.code, row);
    setSelectedLabel(row.label);
    setOpen(false);
  }
  return (
    <div
      className={`${ui.field} tw:relative tw:min-w-0`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <label
        htmlFor={id}
        className="tw:m-0 tw:text-xs! tw:leading-5! tw:font-normal!"
      >
        {label}
      </label>
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && rows.length > 0}
        aria-controls={`${id}-options`}
        value={value}
        disabled={disabled}
        autoComplete="off"
        maxLength={100}
        placeholder="Código ou descrição"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "ArrowDown" && rows.length) {
            event.preventDefault();
            setOpen(true);
            document.getElementById(`${id}-option-0`)?.focus();
          }
        }}
      />
      {open && rows.length > 0 ? (
        <div
          id={`${id}-options`}
          role="listbox"
          className="tw:absolute tw:top-full tw:mt-1 tw:right-0 tw:left-0 tw:z-30 tw:grid tw:max-h-64 tw:overflow-y-auto tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-white tw:p-1 tw:shadow-lg"
        >
          {rows.map((row, index) => (
            <button
              key={row.code}
              id={`${id}-option-${index}`}
              type="button"
              role="option"
              aria-selected={row.code === value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(row)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  document.getElementById(id)?.focus();
                  setOpen(false);
                }
                if (["ArrowDown", "ArrowUp"].includes(event.key)) {
                  event.preventDefault();
                  document
                    .getElementById(
                      `${id}-option-${(index + (event.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length}`,
                    )
                    ?.focus();
                }
              }}
              className="tw:w-full tw:min-w-0 tw:rounded tw:border-0 tw:bg-white tw:p-2 tw:text-left tw:text-xs tw:font-normal tw:whitespace-normal tw:text-[#174983] tw:hover:bg-[#eff5fc] tw:focus:bg-[#eff5fc]"
            >
              <span className="tw:block">{row.code}</span>
              <span className="tw:block tw:text-[11px] tw:leading-relaxed tw:text-[var(--muted)]">
                {row.label}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {selectedLabel ? (
        <small
          className="tw:line-clamp-2 tw:text-[11px] tw:leading-relaxed tw:text-[var(--muted)]"
          title={selectedLabel}
        >
          {selectedLabel}
        </small>
      ) : null}
      {error ? (
        <small role="status" className="tw:text-[11px] tw:text-[#b91c1c]">
          {error}
        </small>
      ) : null}
    </div>
  );
}
export function ProductFiscalForm({
  productId,
  initial,
  issuer,
  canEdit,
  canConfigureIssuer = false,
}: {
  productId: string;
  initial: unknown;
  issuer: FiscalIssuer;
  canEdit: boolean;
  canConfigureIssuer?: boolean;
}) {
  const [profile, setProfile] = useState<ProductFiscalProfile>(() =>
    readProductFiscalProfile(initial),
  );
  const pending = fiscalProfilePending(profile, issuer);
  const simple = ["1", "4"].includes(issuer.crt ?? "");
  const ownIcms = ["00", "20", "90", "900"].includes(profile.icmsCode);
  const simpleOptions = issuer.crt === "4" ? meiCsosnOptions() : CSOSN_OPTIONS;
  const update = (name: keyof ProductFiscalProfile, value: string) =>
    setProfile((current) => ({ ...current, [name]: value }));
  const input = (
    name: keyof ProductFiscalProfile,
    label: string,
    props: { maxLength?: number; decimal?: boolean } = {},
  ) => (
    <label className={ui.field}>
      {label}
      <input
        value={profile[name]}
        onChange={(event) => update(name, event.target.value)}
        maxLength={props.maxLength ?? 30}
        inputMode={props.decimal ? "decimal" : undefined}
        disabled={!canEdit}
      />
    </label>
  );
  const rate = (name: keyof ProductFiscalProfile, label: string) =>
    input(name, label, { decimal: true });
  const contribution = (type: "pis" | "cofins", label: string) => (
    <fieldset className={group}>
      <legend className={legend}>{label}</legend>
      <div className={grid}>
        <label className={ui.field}>
          CST
          <select
            value={profile[`${type}Cst`]}
            onChange={(event) =>
              setProfile((current) => ({
                ...current,
                [`${type}Cst`]: event.target.value,
                [`${type}Rate`]: "",
                [`${type}UnitRate`]: "",
              }))
            }
            disabled={!canEdit}
          >
            <option value="">Selecione</option>
            {CONTRIBUTION_CST_OPTIONS.map(([code, text]) => (
              <option key={code} value={code}>
                {code} · {shortTaxLabels[code] ?? text}
              </option>
            ))}
          </select>
        </label>
        {profile[`${type}Cst`] === "03"
          ? rate(`${type}UnitRate`, "Alíquota (R$/un.)")
          : profile[`${type}Cst`] &&
              !["04", "05", "06", "07", "08", "09"].includes(
                profile[`${type}Cst`],
              )
            ? rate(`${type}Rate`, "Alíquota (%)")
            : null}
      </div>
    </fieldset>
  );
  return (
    <SafeActionForm
      action={updateProductFiscalProfileAction}
      successMessage="Configuração fiscal do produto salva."
      className={`${ui.panel} tw:grid tw:gap-4`}
    >
      <input type="hidden" name="productId" value={productId} />
      <input
        type="hidden"
        name="fiscalProfile"
        value={JSON.stringify(profile)}
      />
      <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:border-b tw:border-[var(--line)] tw:pb-3">
        <span className="tw:text-xs tw:text-[var(--muted)]">
          {issuer.issuerState || "UF não definida"} ·{" "}
          {CRT_OPTIONS.find(([code]) => code === issuer.crt)?.[1] ||
            "Regime não definido"}
        </span>
        {canConfigureIssuer ? (
          <Link
            className={ui.secondary}
            href="/financeiro/configuracoes/notas-fiscais"
          >
            Configurar emitente
          </Link>
        ) : null}
      </div>
      <fieldset className={group}>
        <legend className={legend}>Identificação fiscal</legend>
        <div className={grid}>
          <CatalogField
            label="NCM"
            kind="ncm"
            value={profile.ncm}
            onChange={(value) => update("ncm", value)}
            disabled={!canEdit}
          />
          {input("cest", "CEST", { maxLength: 7 })}
          <label className={ui.field}>
            Origem
            <select
              value={profile.origin}
              onChange={(event) => update("origin", event.target.value)}
              disabled={!canEdit}
            >
              <option value="">Selecione</option>
              {[
                "Nacional",
                "Estrangeira · importação direta",
                "Estrangeira · mercado interno",
                "Nacional · importação superior a 40% até 70%",
                "Nacional · processos produtivos básicos",
                "Nacional · importação até 40%",
                "Estrangeira · direta, sem similar nacional",
                "Estrangeira · interna, sem similar nacional",
                "Nacional · importação superior a 70%",
              ].map((label, code) => (
                <option key={code} value={code}>
                  {code} · {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>
      <fieldset className={group}>
        <legend className={legend}>Unidades e código de barras</legend>
        <div className={grid}>
          {input("commercialUnit", "Unidade comercial", { maxLength: 6 })}
          {input("gtin", "GTIN comercial / SEM GTIN", { maxLength: 14 })}
          {input("tributaryUnit", "Unidade tributável", { maxLength: 6 })}
          {input("gtinTrib", "GTIN tributável / SEM GTIN", { maxLength: 14 })}
          {rate("tributaryFactor", "Fator comercial → tributável")}
        </div>
      </fieldset>
      <fieldset className={group}>
        <legend className={legend}>ICMS · NFC-e interna</legend>
        <div className={grid}>
          <label className={ui.field}>
            CFOP
            <select
              value={profile.cfop}
              onChange={(event) => update("cfop", event.target.value)}
              disabled={!canEdit}
            >
              <option value="">Selecione</option>
              {[
                ["5101", "Venda de produção"],
                ["5102", "Revenda de mercadoria"],
                ["5103", "Produção · fora do local"],
                ["5104", "Revenda · fora do local"],
                ["5115", "Revenda em consignação"],
                ["5405", "Revenda com ST anterior"],
              ].map(([code, label]) => (
                <option key={code} value={code}>
                  {code} · {label}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.field}>
            {issuer.crt ? (simple ? "CSOSN" : "CST ICMS") : "CST / CSOSN"}
            <select
              value={profile.icmsCode}
              onChange={(event) => {
                const code = event.target.value;
                setProfile((current) => ({
                  ...current,
                  icmsCode: code,
                  ...(!["00", "20", "90", "900"].includes(code)
                    ? { icmsRate: "", icmsReduction: "", fcpRate: "" }
                    : {}),
                }));
              }}
              disabled={!canEdit}
            >
              <option value="">Selecione</option>
              {(!issuer.crt || simple) && (
                <optgroup label="Simples Nacional">
                  {simpleOptions.map(([code, label]) => (
                    <option key={code} value={code}>
                      {code} · {shortTaxLabels[code] ?? label}
                    </option>
                  ))}
                </optgroup>
              )}
              {(!issuer.crt || !simple) && (
                <optgroup label="Regime normal">
                  {CST_OPTIONS.map(([code, label]) => (
                    <option key={code} value={code}>
                      {code} · {shortTaxLabels[code] ?? label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          {input("benefitCode", "cBenef (quando aplicável)", { maxLength: 10 })}
          {ownIcms ? rate("icmsRate", "ICMS próprio (%)") : null}
          {ownIcms && ["20", "90", "900"].includes(profile.icmsCode)
            ? rate("icmsReduction", "Redução da base (%)")
            : null}
          {ownIcms ? rate("fcpRate", "FCP próprio (%)") : null}
        </div>
      </fieldset>
      <div className="tw:grid tw:min-w-0 tw:grid-cols-2 tw:gap-3 tw:viewport-980:grid-cols-1">
        {contribution("pis", "PIS")}
        {contribution("cofins", "Cofins")}
      </div>
      <fieldset className={group}>
        <legend className={legend}>IBS e CBS</legend>
        <div className={grid}>
          {input("ibsCbsCst", "CST IBS/CBS", { maxLength: 3 })}
          <CatalogField
            label="Classificação · cClassTrib"
            kind="rtc"
            value={profile.cClassTrib}
            onChange={(value, row) =>
              setProfile((current) => ({
                ...current,
                cClassTrib: value,
                ...(row?.cst ? { ibsCbsCst: row.cst } : {}),
              }))
            }
            disabled={!canEdit}
          />
          {rate("ibsUfRate", "IBS estadual (%)")}
          {rate("ibsMunicipalRate", "IBS municipal (%)")}
          {rate("cbsRate", "CBS (%)")}
        </div>
      </fieldset>
      <label className={ui.field}>
        Informações adicionais do produto
        <textarea
          value={profile.additionalInfo}
          onChange={(event) => update("additionalInfo", event.target.value)}
          maxLength={500}
          rows={3}
          disabled={!canEdit}
          className="tw:w-full tw:min-w-0 tw:resize-y tw:rounded-lg tw:border tw:border-[var(--line)] tw:p-2.5 tw:text-[13px]"
        />
      </label>
      <details className="tw:text-xs tw:text-[var(--muted)]">
        <summary className="tw:cursor-pointer">
          {pending.length
            ? `Dados básicos pendentes (${pending.length})`
            : "Dados básicos preenchidos"}
        </summary>
        <div className="tw:grid tw:gap-2 tw:pt-2">
          {pending.length ? (
            <p className="tw:m-0">{pending.join(" · ")}</p>
          ) : null}
          <p className="tw:m-0">
            A tributação depende do enquadramento do produto e da operação. Este
            cadastro não autoriza a emissão de notas.
          </p>
          <div className="tw:flex tw:flex-wrap tw:gap-3">
            <a
              href="https://portalunico.siscomex.gov.br/classif/"
              target="_blank"
              rel="noreferrer"
            >
              Tabela NCM
            </a>
            <a
              href="https://sped.fazenda.pr.gov.br/NFe/Pagina/CODIGO-DE-BENEFICIO-FISCAL"
              target="_blank"
              rel="noreferrer"
            >
              cBenef · Paraná
            </a>
            <a
              href="https://dfe-portal.svrs.rs.gov.br/DFE/ClassificacaoTributaria"
              target="_blank"
              rel="noreferrer"
            >
              Tabela IBS/CBS
            </a>
          </div>
        </div>
      </details>
      {canEdit ? (
        <footer className="tw:flex tw:flex-wrap tw:justify-end tw:border-t tw:border-[var(--line)] tw:pt-3">
          <SubmitButton
            label="Salvar configuração fiscal"
            pendingLabel="Salvando..."
            className={ui.primary}
          />
        </footer>
      ) : null}
    </SafeActionForm>
  );
}
