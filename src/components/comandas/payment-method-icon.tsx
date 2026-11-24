export function PaymentMethodIcon({ method }: { method: string }) {
  const name = method.toLocaleLowerCase("pt-BR");
  const pix = name.includes("pix");
  const cash = name.includes("dinheiro");
  return <svg viewBox="0 0 24 24" className={`tw:size-5 tw:shrink-0 ${pix ? "tw:text-[#087f75]" : cash ? "tw:text-[#087c4b]" : "tw:text-[#215da5]"}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{pix ? <><path d="m12 2 5 5-5 5-5-5 5-5ZM12 12l5 5-5 5-5-5 5-5ZM2 12l4-4 4 4-4 4-4-4ZM14 12l4-4 4 4-4 4-4-4Z"/></> : cash ? <><rect x="2" y="5" width="20" height="14" rx="1"/><circle cx="12" cy="12" r="3"/><path d="M5 8h1m12 8h1"/></> : <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9h20M6 15h4"/></>}</svg>;
}
export function ComandaTrashIcon() { return <svg viewBox="0 0 24 24" className="tw:size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></svg>; }
