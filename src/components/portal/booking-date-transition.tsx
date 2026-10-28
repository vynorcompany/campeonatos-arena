"use client";
import { useTransition, type ReactNode, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
/** Keep the previous date's controls inactive until the new schedule has committed. */
export function BookingDateTransition({ children }: { children: ReactNode }) {
  const router=useRouter();
  const [pending,startTransition]=useTransition();
  const navigate=(event:MouseEvent<HTMLDivElement>)=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const target=event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-booking-date]") : null;
    if(!target)return;
    event.preventDefault();
    startTransition(()=>router.push(target.pathname+target.search,{scroll:false}));
  };
  return <div className="tw:min-w-0" onClickCapture={navigate} aria-busy={pending}>
    <span role="status" aria-live="polite" className={pending ? "tw:mb-3 tw:block tw:rounded-xl tw:bg-[#e4eaf2] tw:px-3 tw:py-2 tw:text-xs tw:font-medium tw:text-[#08387b] tw:dark:bg-[#213148] tw:dark:text-[#a5bcdc]" : "tw:sr-only"}>{pending ? "Carregando horários da data selecionada…" : ""}</span>
    <fieldset disabled={pending} className="tw:m-0 tw:min-w-0 tw:border-0 tw:p-0 tw:disabled:opacity-60">{children}</fieldset>
  </div>;
}
