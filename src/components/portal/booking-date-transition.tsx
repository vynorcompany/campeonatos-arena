"use client";
import { useRef, useState, useTransition, type ReactNode, type MouseEvent } from "react";

/** Refresh only booking content; retain the URL, portal shell and scroll position. */
export function BookingDateTransition({ children, loadDate }: { children: ReactNode; loadDate: (date: string) => Promise<ReactNode> }) {
  const [content, setContent] = useState(children);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const navigate = (event: MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-booking-date]") : null;
    if (!target) return;
    event.preventDefault();
    if (inFlight.current || target.getAttribute("aria-current") === "date") return;
    const date = new URL(target.href).searchParams.get("data");
    if (!date) return;
    inFlight.current = true;
    setError("");
    startTransition(async () => {
      try {
        setContent(await loadDate(date));
      } catch {
        setError("Não foi possível atualizar os horários. Tente selecionar o dia novamente.");
      } finally {
        inFlight.current = false;
      }
    });
  };
  return <div className="tw:relative tw:min-w-0" onClickCapture={navigate} aria-busy={pending}>
    <span role="status" aria-live="polite" className={pending ? "tw:absolute tw:right-3 tw:top-3 tw:z-30 tw:rounded-md tw:bg-[#174983] tw:px-3 tw:py-2 tw:text-xs tw:text-white tw:shadow-sm" : "tw:sr-only"}>{pending ? "Atualizando horários…" : ""}</span>
    {error ? <p role="alert" className="tw:rounded-md tw:bg-red-50 tw:p-3 tw:text-sm tw:text-red-800 tw:dark:bg-red-950 tw:dark:text-red-100">{error}</p> : null}
    <fieldset disabled={pending} className="tw:m-0 tw:min-w-0 tw:border-0 tw:p-0 tw:disabled:opacity-60">{content}</fieldset>
  </div>;
}
