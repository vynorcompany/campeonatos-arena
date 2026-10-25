"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
const storageKey = "arena-cookie-notice-v1";
export function CookiePreferences({ arenaSlug }: { arenaSlug?: string }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => { try { setOpen(localStorage.getItem(storageKey) !== "essential-only"); } catch { setOpen(true); } }, []);
  const acknowledge = () => {
    let stored = true;
    try { localStorage.setItem(storageKey, "essential-only"); } catch { stored = false; }
    setNotice(stored ? "Apenas cookies essenciais. Não há rastreadores opcionais nesta versão." : "Apenas cookies essenciais. Seu navegador não permitiu guardar este aviso.");
    setOpen(false); button.current?.focus();
  };
  return <div className="tw:grid tw:gap-3 tw:[--panel:#fff] tw:[--line:#d8e5df] tw:[--text:#203c2e] tw:dark:[--panel:#102d25] tw:dark:[--line:#29483f] tw:dark:[--text:#eaf3e9]"><button ref={button} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)} className="tw:min-h-9 tw:justify-self-start tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:px-3 tw:py-2 tw:text-xs tw:font-semibold tw:text-[var(--text)]">Preferências de cookies</button>{open ? <section id={id} aria-labelledby={`${id}-title`} className="tw:grid tw:gap-3 tw:rounded-xl tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:p-4 tw:text-sm tw:leading-relaxed tw:text-[var(--text)]"><h2 id={`${id}-title`} className="tw:m-0 tw:text-sm tw:font-semibold">Cookies essenciais para acessar sua conta</h2><p className="tw:m-0 tw:text-xs">Usamos cookies de autenticação e contexto da arena. Esta versão não ativa cookies de publicidade ou análise de comportamento. O aviso registra somente sua preferência de exibição neste navegador.</p><div className="tw:flex tw:flex-wrap tw:items-center tw:gap-3"><button type="button" onClick={acknowledge} className="tw:min-h-11 tw:rounded-xl tw:bg-[#175a40] tw:px-4 tw:py-2 tw:text-xs tw:font-semibold tw:text-white">Entendi · manter apenas essenciais</button><Link href={arenaSlug ? `/classificacao/${encodeURIComponent(arenaSlug)}/legal/cookies` : "/legal/cookies"} className="tw:inline-flex tw:min-h-10 tw:items-center tw:text-xs tw:underline tw:underline-offset-4">Como controlar os cookies</Link></div></section> : null}<span role="status" className="tw:text-xs tw:leading-relaxed">{notice}</span></div>;
}
