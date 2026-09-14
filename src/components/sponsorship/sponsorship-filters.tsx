"use client";

import { useMemo, useState } from "react";

type Option = { value: string; label: string };

function SearchableSelect({ label, name, value, options, placeholder }: { label: string; name: string; value: string; options: Option[]; placeholder: string }) {
  const [query, setQuery] = useState(options.find((option) => option.value === value)?.label ?? "");
  const [selected, setSelected] = useState(value);
  const [open, setOpen] = useState(false);
  const filteredOptions = useMemo(() => options.filter((option) => option.label.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))), [options, query]);

  return <label className="sponsorship-searchable-select">
    <span>{label}</span>
    <input type="hidden" name={name} value={selected} />
    <input value={query} placeholder={placeholder} autoComplete="off" role="combobox" aria-expanded={open} aria-controls={`${name}-options`} onFocus={() => setOpen(true)} onChange={(event) => { const nextQuery = event.currentTarget.value; setQuery(nextQuery); setSelected(options.find((option) => option.label.toLocaleLowerCase("pt-BR") === nextQuery.toLocaleLowerCase("pt-BR"))?.value ?? ""); setOpen(true); }} onBlur={() => window.setTimeout(() => setOpen(false), 120)} />
    {open ? <div className="sponsorship-filter-options" id={`${name}-options`} role="listbox">
      {filteredOptions.map((option) => <button key={option.value || "all"} type="button" role="option" aria-selected={selected === option.value} onMouseDown={(event) => event.preventDefault()} onClick={() => { setSelected(option.value); setQuery(option.label); setOpen(false); }}>{option.label}</button>)}
      {!filteredOptions.length ? <span>Nenhuma opção encontrada.</span> : null}
    </div> : null}
  </label>;
}

export function SponsorshipFilters({ query, type, sort, planTypes }: { query: string; type: string; sort: string; planTypes: string[] }) {
  return <form method="get" className="sponsorship-filter-form">
    <label>Pesquisa<input name="q" defaultValue={query} placeholder="Digite o nome do plano" /></label>
    <SearchableSelect label="Filtros" name="type" value={type} placeholder="Todos os tipos" options={[{ value: "", label: "Todos os tipos" }, ...planTypes.map((item) => ({ value: item, label: item }))]} />
    <SearchableSelect label="Classificação" name="sort" value={sort} placeholder="Nome do plano" options={[{ value: "name", label: "Nome do plano" }, { value: "value", label: "Maior valor mensal" }, { value: "companies", label: "Mais empresas" }]} />
    <button className="button button-small" type="submit">Aplicar</button>
  </form>;
}
