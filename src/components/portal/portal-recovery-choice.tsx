"use client";

import React from "react";
import Link from "next/link";

export function PortalRecoveryChoice({ onWhatsApp, onBack }: { onWhatsApp: () => void; onBack: () => void }) {
  const option = "tw:flex tw:min-h-12 tw:w-full tw:cursor-pointer tw:items-center tw:gap-3 tw:rounded-[5px] tw:border tw:border-solid tw:border-[#bac8d8] tw:bg-transparent tw:px-4 tw:py-3 tw:text-left tw:text-sm tw:font-normal tw:text-[#174983] tw:no-underline tw:hover:border-[#174983] tw:hover:bg-[#f4f7fb] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:dark:border-[#3b5271] tw:dark:text-[#a5caff] tw:dark:hover:border-[#a5caff] tw:dark:hover:bg-[#14263d]";
  return <div className="tw:grid tw:gap-3" aria-label="Forma de recuperação de senha">
    <Link href="/portal/recuperar-email" className={option}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="tw:size-5 tw:shrink-0"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg>E-mail</Link>
    <button type="button" className={option} onClick={onWhatsApp}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="tw:size-5 tw:shrink-0"><path d="M20 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.2A8.5 8.5 0 1 1 20 11.5Z"/><path d="M8 7.5c.5 3.7 2 5.2 5.7 6l1-1.4 2 1.1c-.3 2-2 2.2-3.5 1.7-4-1.3-6.5-4-6.2-7.1Z"/></svg>WhatsApp</button>
    <button type="button" onClick={onBack} className="tw:mt-2 tw:min-h-10 tw:w-fit tw:cursor-pointer tw:rounded-[5px] tw:border-0 tw:bg-transparent tw:px-2 tw:text-sm tw:font-normal tw:text-[#174983] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:dark:text-[#a5caff]">Voltar</button>
  </div>;
}
