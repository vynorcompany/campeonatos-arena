import React from "react";
import { viewStyles } from "./page.utilities";

export type DashboardCashDay = { label: string; income: number; expense: number };

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

export function DashboardCashChart({ days, view, reference, cumulative = false }: { days: DashboardCashDay[]; view: "caixa" | "competencia"; reference?: { value: number; label: string }; cumulative?: boolean }) {
  const hasMovements = days.some((day) => day.income !== 0 || day.expense !== 0);
  if (!hasMovements && !reference) {
    return <div className={viewStyles.dashboard_cash_chart}><p className="tw:m-0 tw:flex tw:h-full tw:items-center tw:justify-center tw:text-center tw:text-sm tw:text-[var(--muted)]">Sem movimentação financeira no período.</p></div>;
  }

  const max = Math.max(1, reference?.value ?? 0, ...days.flatMap((day) => [day.income, day.expense]));
  const tickInterval = days.length <= 7 ? 1 : Math.ceil((days.length - 1) / 5);
  const income = cumulative ? days.at(-1)?.income ?? 0 : days.reduce((total, day) => total + day.income, 0);
  const expense = cumulative ? days.at(-1)?.expense ?? 0 : days.reduce((total, day) => total + day.expense, 0);
  const scrollLongPeriod = days.length > 45;

  return <div className={viewStyles.dashboard_cash_chart} role="img" aria-label={`Gráfico ${cumulative ? "acumulado" : "diário"} de entradas e saídas na visão de ${view}. Total de entradas: ${money(income)}. Total de saídas: ${money(expense)}.`}>
    <div className={viewStyles.dashboard_cash_bars} style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`, ...(scrollLongPeriod ? { minWidth: `${days.length * 8 + 40}px` } : {}) }}>
      {days.map((day, index) => <div className={viewStyles.dashboard_cash_day} key={`${index}-${day.label}`} title={`${day.label}: entradas ${money(day.income)}, saídas ${money(day.expense)}`}>
        <div className={`${viewStyles.dashboard_cash_column} tw:relative`}>
          {reference ? <i className="tw:absolute tw:inset-x-0 tw:z-10 tw:border-t-2 tw:border-dashed tw:border-amber-700" style={{ bottom: `${reference.value / max * 100}%` }} aria-label={`${reference.label}: ${money(reference.value)}`} /> : null}
          <span className={viewStyles.dashboard_cash_income} style={{ height: `${(day.income / max) * 100}%` }} />
          <span className={viewStyles.dashboard_cash_expense} style={{ height: `${(day.expense / max) * 100}%` }} />
        </div>
        <small>{index === 0 || index === days.length - 1 || index % tickInterval === 0 ? day.label : null}</small>
      </div>)}
    </div>
  </div>;
}
