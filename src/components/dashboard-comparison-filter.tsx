"use client";

import { useState } from "react";

export function DashboardComparisonFilter({ mode, from, to }: { mode?: string; from: string; to: string }) {
  const [comparisonMode, setComparisonMode] = useState(mode ?? "none");
  return <>
    <label>Comparar com<select name="comparar" value={comparisonMode} onChange={(event) => setComparisonMode(event.target.value)}><option value="none">Não comparar</option><option value="previous-month">Mês anterior</option><option value="previous-year">Mesmo período do ano passado</option><option value="custom">Personalizado</option></select></label>
    {comparisonMode === "custom" ? <><label>Início da comparação<input type="date" name="compararDataInicial" defaultValue={from} /></label><label>Fim da comparação<input type="date" name="compararDataFinal" defaultValue={to} /></label></> : null}
  </>;
}
