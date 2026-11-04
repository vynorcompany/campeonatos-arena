import { z } from "zod";
const opening = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), startsAtMinute: z.number().int().min(0).max(1439), endsAtMinute: z.number().int().min(1).max(1440), priceCents: z.number().int().min(0), online: z.boolean() });
export function readDateAvailability(value: unknown) { return z.array(opening).safeParse(value).data ?? []; }
export function availabilityDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
type Rule = { weekday:number; startsAtMinute:number; endsAtMinute:number; priceCents:number; available:boolean };
/** Date-specific openings precede weekly rules, without changing any other day. */
export function courtRulesForDate(rules: Rule[], value: unknown, date: Date, online = false): Rule[] {
  const openings = readDateAvailability(value).filter(row=>row.date===availabilityDate(date) && (!online || row.online));
  // Split the weekly ranges so a dated opening cannot be bypassed by a larger weekly range.
  let remaining = [...rules];
  for(const row of openings) remaining=remaining.flatMap(rule=>rule.weekday!==date.getDay() || rule.endsAtMinute<=row.startsAtMinute || rule.startsAtMinute>=row.endsAtMinute ? [rule] : [ ...(rule.startsAtMinute<row.startsAtMinute ? [{...rule,endsAtMinute:row.startsAtMinute}] : []), ...(rule.endsAtMinute>row.endsAtMinute ? [{...rule,startsAtMinute:row.endsAtMinute}] : []) ]);
  return [...openings.map(row=>({weekday:date.getDay(),startsAtMinute:row.startsAtMinute,endsAtMinute:row.endsAtMinute,priceCents:row.priceCents,available:true})),...remaining];
}
