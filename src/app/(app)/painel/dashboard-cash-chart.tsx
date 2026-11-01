import React from "react";
import { viewStyles } from "./page.utilities";
import { cashChartScale } from "@/lib/reports/cash-chart-scale";

export type DashboardCashDay = { label: string; income: number; expense: number };
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

export function DashboardCashChart({ days, view, reference, cumulative = false }: { days: DashboardCashDay[]; view: "caixa" | "competencia"; reference?: { value: number; label: string }; cumulative?: boolean }) {
  if (!days.some(day => day.income !== 0 || day.expense !== 0) && !reference) return <div className={viewStyles.dashboard_cash_chart}><p className="tw:m-0 tw:flex tw:h-full tw:items-center tw:justify-center tw:text-center tw:text-sm tw:text-[var(--muted)]">Sem movimentação financeira no período.</p></div>;
  const scale = cashChartScale(days, reference?.value);
  const axisWidth = Math.max(56, ...scale.ticks.map(value => money(value).length * 6));
  const income = cumulative ? days.at(-1)?.income ?? 0 : days.reduce((sum, day) => sum + day.income, 0);
  const expense = cumulative ? days.at(-1)?.expense ?? 0 : days.reduce((sum, day) => sum + day.expense, 0);
  const width = Math.max(400, days.length * 12), height = 150;
  const y = (value: number) => scale.position(value) * height;
  const step = width / Math.max(1, days.length), barWidth = Math.min(16, step * .28);
  const tickInterval = days.length <= 7 ? 1 : Math.ceil((days.length - 1) / 5);
  const points = days.map((day, index) => `${(index + .5) * step},${y(day.income - day.expense)}`).join(" ");
  return <div className={`${viewStyles.dashboard_cash_chart} tw:grid tw:grid-cols-[auto_minmax(0,1fr)] tw:gap-2`} role="img" aria-label={`Gráfico ${cumulative ? "acumulado" : "diário"} de entradas e saídas na visão de ${view}. Eixo em reais. Total de entradas: ${money(income)}. Total de saídas: ${money(expense)}. Linha de evolução do resultado: entradas menos saídas.`}>
    <div className="tw:relative tw:mb-5 tw:text-right tw:text-[10px] tw:tabular-nums tw:text-slate-500" style={{ width: axisWidth }}>{scale.ticks.map((value, index) => <span key={index} className="tw:absolute tw:right-0 tw:whitespace-nowrap" style={{ top: `${scale.position(value) * 100}%`, transform: index === 0 ? "none" : index === scale.ticks.length - 1 ? "translateY(-100%)" : "translateY(-50%)" }}>{money(value)}</span>)}</div>
    <div className="tw:flex tw:min-w-0 tw:flex-col tw:overflow-x-auto"><div className="tw:flex tw:min-h-0 tw:flex-1 tw:flex-col" style={days.length > 45 ? { minWidth: days.length * 8 + 40 } : undefined}>
      <svg className="tw:block tw:min-h-0 tw:w-full tw:flex-1 tw:overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        {scale.ticks.map((value, index) => <line key={index} x1="0" x2={width} y1={y(value)} y2={y(value)} stroke="#dbe4ef" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
        {days.map((day, index) => <g className="dashboard-cash-day" key={index}><title>{`${day.label}: entradas ${money(day.income)}, saídas ${money(day.expense)}, resultado ${money(day.income - day.expense)}`}</title><rect className="dashboard-cash-income" x={(index + .5) * step - barWidth - 1} y={Math.min(y(0), y(day.income))} width={barWidth} height={Math.abs(y(0) - y(day.income))} fill="#238b45" rx="1"/><rect className="dashboard-cash-expense" x={(index + .5) * step + 1} y={Math.min(y(0), y(day.expense))} width={barWidth} height={Math.abs(y(0) - y(day.expense))} fill="#d95b4f" rx="1"/></g>)}
        {reference ? <line x1="0" x2={width} y1={y(reference.value)} y2={y(reference.value)} stroke="#b45309" strokeWidth="2" vectorEffect="non-scaling-stroke"><title>{`${reference.label}: ${money(reference.value)}`}</title></line> : null}
        <polyline points={points} fill="none" stroke="#6d28d9" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {days.length === 1 ? <circle cx={step / 2} cy={y(days[0].income - days[0].expense)} r="3" fill="#6d28d9" /> : null}
      </svg>
      <div className="tw:relative tw:h-5 tw:shrink-0 tw:text-[10px] tw:text-slate-500">{days.map((day, index) => index === 0 || index === days.length - 1 || index % tickInterval === 0 ? <span key={index} className="tw:absolute tw:top-1 tw:whitespace-nowrap" style={{ left: `${(index + .5) / Math.max(1, days.length) * 100}%`, transform: index === 0 ? "none" : index === days.length - 1 ? "translateX(-100%)" : "translateX(-50%)" }}><small>{day.label}</small></span> : null)}</div>
    </div></div>
  </div>;
}
