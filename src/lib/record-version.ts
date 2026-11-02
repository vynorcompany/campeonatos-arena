export const staleRecordMessage = "Este registro mudou desde que você abriu o formulário. Seus dados não foram salvos. Confira a versão atual antes de tentar novamente.";
export class StaleRecordError extends Error { constructor(){super(staleRecordMessage);this.name="StaleRecordError";} }
export function recordVersion(value: Date | string | null | undefined) { return value ? new Date(value).toISOString() : "NONE"; }
export function assertRecordVersion(actual: string, expected: unknown) { if(typeof expected!=="string" || expected!==actual) throw new StaleRecordError(); }
export function expectedRecordDate(value: unknown): Date | null { if(typeof value!=="string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) return null;const date=new Date(value);return Number.isNaN(date.getTime())?null:date; }
