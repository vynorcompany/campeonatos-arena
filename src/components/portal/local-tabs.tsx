"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
export function PortalLocalTabs({
  label,
  initial,
  tabs,
  hashTabs,
}: {
  label: string;
  initial: string;
  hashTabs?: Record<string, string>;
  tabs: {
    id: string;
    label: string;
    content?: ReactNode;
    load?: () => Promise<ReactNode>;
    href?: string;
  }[];
}) {
  const [selected, setSelected] = useState(
    tabs.some((tab) => tab.id === initial) ? initial : tabs[0]?.id,
  );
  useEffect(() => {
    if (!hashTabs) return;
    const activate = (href: string) => {
      const url = new URL(href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        url.searchParams.get("arena") !==
          new URL(window.location.href).searchParams.get("arena")
      )
        return;
      const match = Object.entries(hashTabs).find(([prefix]) =>
        url.hash.startsWith(`#${prefix}`),
      );
      if (match) setSelected(match[1]);
    };
    const click = (event: MouseEvent) => {
      if (
        event.button ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        anchor &&
        !anchor.download &&
        (!anchor.target || anchor.target === "_self")
      )
        activate(anchor.href);
    };
    const hash = () => activate(window.location.href);
    document.addEventListener("click", click, true);
    window.addEventListener("hashchange", hash);
    return () => {
      document.removeEventListener("click", click, true);
      window.removeEventListener("hashchange", hash);
    };
  }, [hashTabs]);
  const prefix = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div
      className="tw:grid tw:min-w-0 tw:gap-4"
      onClickCapture={(event) => {
        const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>(
          "a[href]",
        );
        if (
          !anchor ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        const tab = tabs.find(
          (item) =>
            item.href &&
            new URL(item.href, window.location.href).href === anchor.href,
        );
        if (tab) {
          event.preventDefault();
          setSelected(tab.id);
        }
      }}
    >
      <div
        role="tablist"
        aria-label={label}
        className="tw:flex tw:min-w-0 tw:gap-1 tw:overflow-x-auto tw:border-b tw:border-[#b8cfee] tw:pb-1 tw:dark:border-[#365879]"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            id={`${prefix}-${tab.id}-tab`}
            aria-controls={`${prefix}-${tab.id}-panel`}
            role="tab"
            aria-selected={selected === tab.id}
            tabIndex={selected === tab.id ? 0 : -1}
            type="button"
            onClick={() => setSelected(tab.id)}
            onKeyDown={(event) => {
              const delta =
                event.key === "ArrowRight"
                  ? 1
                  : event.key === "ArrowLeft"
                    ? -1
                    : 0;
              const target =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? tabs.length - 1
                    : delta
                      ? (index + delta + tabs.length) % tabs.length
                      : null;
              if (target !== null) {
                event.preventDefault();
                setSelected(tabs[target].id);
                buttons.current[target]?.focus();
              }
            }}
            className="tw:viewport-620:px-1.5 tw:viewport-620:text-xs tw:min-h-10 tw:shrink-0 tw:cursor-pointer tw:rounded-md tw:border-0 tw:bg-transparent tw:px-3 tw:py-2 tw:text-sm tw:font-medium tw:text-[#354f70] tw:aria-selected:bg-[#174983] tw:aria-selected:text-white tw:dark:text-[#c2d5ee] tw:dark:aria-selected:bg-[#174983] tw:dark:aria-selected:text-white tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#215da5]"
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${prefix}-${tab.id}-panel`}
          aria-labelledby={`${prefix}-${tab.id}-tab`}
          hidden={selected !== tab.id}
          className={selected !== tab.id ? "tw:hidden" : "tw:min-w-0"}
        >
          {tab.load ? (
            <LazyTabContent active={selected === tab.id} load={tab.load} />
          ) : (
            tab.content
          )}
        </div>
      ))}
    </div>
  );
}

function LazyTabContent({
  active,
  load,
}: {
  active: boolean;
  load: () => Promise<ReactNode>;
}) {
  const [content, setContent] = useState<ReactNode>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const requested = useRef<typeof load | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!active || requested.current === load) return;
    requested.current = load;
    setLoading(true);
    setError(false);
    void load()
      .then((node) => {
        if (mounted.current && requested.current === load) {
          setContent(node);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted.current && requested.current === load) {
          setError(true);
          setLoading(false);
        }
      });
  }, [active, load, attempt]);
  return (
    <div aria-busy={loading} className="tw:min-w-0">
      {content}
      {(loading || !requested.current) && !content ? (
        <p
          role="status"
          className="tw:py-4 tw:text-sm tw:text-[var(--portal-muted)]"
        >
          Carregando…
        </p>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="tw:grid tw:justify-items-start tw:gap-2 tw:py-4 tw:text-sm"
        >
          Não foi possível carregar este menu.
          <button
            type="button"
            onClick={() => {
              requested.current = null;
              setAttempt((value) => value + 1);
            }}
            className="tw:rounded-md tw:border tw:border-[var(--portal-line)] tw:bg-[var(--portal-surface)] tw:px-3 tw:py-2 tw:text-[var(--portal-ink)]"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}
    </div>
  );
}
