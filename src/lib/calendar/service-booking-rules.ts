import { z } from "zod";

export const serviceBookingRulesSchema = z.object({
  dailyWindows: z.array(z.object({
    weekday: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
  }).refine(window => window.endMinute > window.startMinute, "O fim da faixa deve ser posterior ao início.")).max(7)
    .refine(windows => new Set(windows.map(window => window.weekday)).size === windows.length, "Informe apenas uma faixa por dia.").optional(),
  minimumMinutes: z.number().int().min(15).max(720).multipleOf(15).nullable().default(null),
  courtIds: z.array(z.string().min(1)).max(100).default([]),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  startMinute: z.number().int().min(0).max(1439).default(0),
  endMinute: z.number().int().min(1).max(1440).default(1440),
}).refine(value => value.endMinute > value.startMinute, "O fim da faixa deve ser posterior ao início.");
export type ServiceBookingRules = z.infer<typeof serviceBookingRulesSchema>;
export function readServiceBookingRules(value: unknown): ServiceBookingRules {
  return serviceBookingRulesSchema.parse(value ?? {});
}
export function servicePermitsInterval(rules: ServiceBookingRules, courtId: string, weekday: number, start: number, duration: number) {
  const window = rules.dailyWindows === undefined ? rules : rules.dailyWindows.find(window => window.weekday === weekday);
  if (!window) return false;
  return (!rules.courtIds.length || rules.courtIds.includes(courtId))
    && (rules.dailyWindows !== undefined || !rules.weekdays.length || rules.weekdays.includes(weekday))
    && start >= window.startMinute && start + duration <= window.endMinute
    && (rules.minimumMinutes === null || duration >= rules.minimumMinutes);
}
/** A service can extend the court's duration choices; every selected service must permit the entire interval. */
export function servicePermitsDuration(base: readonly number[], duration: number, selected: readonly { rules: ServiceBookingRules }[], courtId: string, weekday: number, start: number, step: number) {
  return duration > 0 && duration % step === 0
    && selected.every(service => servicePermitsInterval(service.rules, courtId, weekday, start, duration))
    && (base.includes(duration) || selected.some(service => service.rules.minimumMinutes !== null && duration >= service.rules.minimumMinutes));
}
export function serviceRuleDetails(rules: ServiceBookingRules, courts: readonly { id: string; name: string }[]) {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const time = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
  const weekdays = rules.dailyWindows?.map(window => window.weekday) ?? rules.weekdays;
  const orderedDays = [1,2,3,4,5,6,0].filter(day => weekdays.includes(day));
  return [
    { label: "Quadras", value: rules.courtIds.length ? rules.courtIds.map(id => courts.find(court => court.id === id)?.name ?? "Quadra indisponível").join(", ") : "Todas as quadras" },
    { label: "Dias", value: rules.dailyWindows?.length === 0 ? "Nenhum dia disponível" : !orderedDays.length || orderedDays.length === 7 ? "Todos os dias" : orderedDays.map(day => days[day]).join(" · ") },
    { label: "Horário", value: rules.dailyWindows !== undefined ? orderedDays.map(day => { const window = rules.dailyWindows!.find(window => window.weekday === day)!; return `${days[day]} ${time(window.startMinute)}–${time(window.endMinute)}`; }).join(" · ") || "Indisponível" : rules.startMinute === 0 && rules.endMinute === 1440 ? "Durante o funcionamento da arena" : `${time(rules.startMinute)} às ${time(rules.endMinute)}` },
  ];
}
