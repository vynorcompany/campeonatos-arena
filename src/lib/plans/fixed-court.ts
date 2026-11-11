export type WeeklyRule = { weekday: number; startsAtMinute: number; endsAtMinute: number; available: boolean };
export function availableFixedTimes(rules: WeeklyRule[], weekday: number, duration: number, step = 30) {
  const times: number[] = [];
  if (!Number.isInteger(duration) || duration < 15 || duration > 720) return times;
  for (let minute = 0; minute + duration <= 1440; minute += step) {
    // Join adjacent configured ranges; unavailable gaps must not be bridged.
    let cursor = minute;
    const ranges = rules.filter(r => r.weekday === weekday && r.available).sort((a,b)=>a.startsAtMinute-b.startsAtMinute);
    for (const range of ranges) if (range.startsAtMinute <= cursor && range.endsAtMinute > cursor) cursor = range.endsAtMinute;
    if (cursor >= minute + duration) times.push(minute);
  }
  return times;
}
export function fixedMonthAmount(base: number, year: number, month: number, weekday: number, prorate: boolean) {
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  let count = 0;
  for(let day=1;day<=days;day++) if(new Date(Date.UTC(year,month,day)).getUTCDay()===weekday) count++;
  return { amountCents: Math.round(base * (prorate ? count / 4 : 1)), occurrences: count };
}
export function planDueDays(values: unknown[], fallback=10) {
  const days = [...new Set(values.length ? values.map(Number) : [fallback])].sort((a,b)=>a-b);
  if(!days.length || days.some(d=>!Number.isInteger(d)||d<1||d>28)) throw new Error("Escolha vencimentos entre os dias 1 e 28.");
  return days;
}

export function fixedCycle(base: number, credits: number, year: number, month: number, weekdays: number[], prorate: boolean) {
  const occurrences = weekdays.reduce((sum,day)=>sum+fixedMonthAmount(0,year,month,day,false).occurrences,0);
  const ratio = prorate ? occurrences / (4 * weekdays.length) : 1;
  return { occurrences, amountCents: Math.round(base * ratio), credits: credits > 0 ? Math.max(1,Math.round(credits * ratio)) : occurrences };
}
export function fixedSchedules(value: unknown, fallback: {weekday: number;startMinute:number}) {
  const rows = value == null || value === "" ? [fallback] : JSON.parse(String(value));
  if(!Array.isArray(rows)||rows.length<1||rows.length>7||rows.some(r=>!Number.isInteger(r.weekday)||r.weekday<0||r.weekday>6||!Number.isInteger(r.startMinute)||r.startMinute<0||r.startMinute>=1440)||new Set(rows.map(r=>r.weekday)).size!==rows.length) throw new Error("Selecione dias diferentes e horários válidos para o plano.");
  return rows as {weekday:number;startMinute:number}[];
}
