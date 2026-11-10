/** Render only from server-recorded agent provenance, never from the actor's display name. */
export function AgentActionBadge({name}:{name?:string}) {
 const label=name?`Ação executada pelo agente de IA ${name}`:"Ação executada por agente de IA";
 return <span role="img" aria-label={label} title={label} className="tw:ml-1.5 tw:inline-flex tw:items-center tw:gap-0.5 tw:align-middle tw:text-[#526884] tw:font-normal"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="tw:size-3.5 tw:shrink-0"><rect x="5" y="5" width="14" height="14" rx="3"/><path d="M9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3M9 10h.01M15 10h.01M9 14h6"/></svg><span aria-hidden="true" className="tw:text-[9px] tw:leading-none">IA</span></span>;
}
