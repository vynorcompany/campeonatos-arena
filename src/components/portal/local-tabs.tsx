"use client";
import { submenuTabs } from "@/components/ui/submenu-tabs";
import { useFilterMemory } from "@/components/filters/filter-memory";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
export function PortalLocalTabs({
  label,
  initial,
  tabs,
  hashTabs,
  navigation = "tabs",
  context,
  queryParam,
}: {
  navigation?: "tabs" | "select";
  context?: ReactNode;
  queryParam?: string;
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
  const [remembered,setRemembered] = useFilterMemory(`tabs:${label}`, initial);
  const [selected, setSelected] = useState(
    tabs.some((tab) => tab.id === initial) ? initial : tabs[0]?.id,
  );
  const explicitSelection = useRef<string | null | undefined>(undefined);
  if (explicitSelection.current === undefined && typeof window !== "undefined") explicitSelection.current = queryParam ? new URL(window.location.href).searchParams.get(queryParam) : null;
  useEffect(() => {
    const preferred = explicitSelection.current;
    if (preferred && tabs.some(tab => tab.id === preferred)) setSelected(preferred);
    else if (tabs.some(tab => tab.id === remembered)) setSelected(remembered);
  }, [remembered]);
  const selectTab=(id:string)=>{explicitSelection.current = null;setSelected(id);setRemembered(id);};
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
      if (match) selectTab(match[1]);
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
    const hash = (event: HashChangeEvent) => activate(event.newURL);
    document.addEventListener("click", click, true);
    window.addEventListener("hashchange", hash);
    return () => {
      document.removeEventListener("click", click, true);
      window.removeEventListener("hashchange", hash);
    };
  }, [hashTabs]);
  useEffect(() => {
    if (!queryParam || !selected) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get(queryParam) !== selected) { url.searchParams.set(queryParam, selected); window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`); }
  }, [queryParam, selected]);
  useEffect(() => {
    if (!queryParam) return;
    const back = () => { const value = new URL(window.location.href).searchParams.get(queryParam); if (value && tabs.some(tab => tab.id === value)) selectTab(value); };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [queryParam, tabs]);
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
          selectTab(tab.id);
        }
      }}
    >
      {navigation === "select" ? <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-start tw:justify-between tw:gap-x-4 tw:gap-y-3"><div className="tw:min-w-0 tw:flex-1">{context}</div><label className="tw:grid tw:gap-1"><span className="tw:sr-only">{label}</span><select aria-label={label} value={selected} onChange={event => selectTab(event.target.value)} className="tw:min-h-10 tw:max-w-full tw:rounded-md tw:border tw:border-[var(--portal-line)] tw:bg-[var(--portal-surface)] tw:px-3 tw:text-xs tw:font-normal tw:text-[var(--portal-ink)] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:dark:focus-visible:outline-[#a5caff]">{tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}</select></label></div> : <div
        role="tablist"
        aria-label={label}
        className={submenuTabs.bar}
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
            onClick={() => selectTab(tab.id)}
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
                selectTab(tabs[target].id);
                buttons.current[target]?.focus();
              }
            }}
            className={submenuTabs.item + " tw:viewport-620:px-1.5 tw:viewport-620:text-xs"}
          >
            {tab.label}
          </button>
        ))}
      </div>}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${prefix}-${tab.id}-panel`}
          aria-labelledby={navigation === "tabs" ? `${prefix}-${tab.id}-tab` : undefined}
          aria-label={navigation === "select" ? tab.label : undefined}
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
