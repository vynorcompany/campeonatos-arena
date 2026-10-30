"use client";
import { useId, useState, type ReactNode, type KeyboardEvent } from "react";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export function ProductEditorTabs({
  panels,
  initialTab,
}: {
  panels: { id: string; label: string; content: ReactNode }[];
  initialTab?: string;
}) {
  const [active, setActive] = useState(
    panels.some((panel) => panel.id === initialTab)
      ? initialTab!
      : panels[0].id,
  );
  const id = useId();
  function select(value: string) {
    setActive(value);
    const url = new URL(window.location.href);
    url.searchParams.set("aba", value);
    window.history.replaceState(null, "", url);
  }
  function onKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? panels.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + panels.length) %
            panels.length;
    select(panels[next].id);
    document.getElementById(`${id}-tab-${panels[next].id}`)?.focus();
  }
  return (
    <div className={ui.page}>
      <div
        role="tablist"
        aria-label="Edição do produto"
        className="tw:flex tw:min-w-0 tw:flex-wrap tw:gap-1 tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-white tw:p-1"
      >
        {panels.map((panel, index) => (
          <button
            key={panel.id}
            type="button"
            role="tab"
            id={`${id}-tab-${panel.id}`}
            aria-controls={`${id}-panel-${panel.id}`}
            aria-selected={active === panel.id}
            tabIndex={active === panel.id ? 0 : -1}
            onClick={() => select(panel.id)}
            onKeyDown={(event) => onKey(event, index)}
            className={`${ui.secondary} ${active === panel.id ? "tw:border-[#1e5ea8]! tw:bg-[#1e5ea8]! tw:text-white!" : "tw:border-transparent! tw:bg-transparent!"}`}
          >
            {panel.label}
          </button>
        ))}
      </div>
      {panels.map((panel) => (
        <div
          key={panel.id}
          role="tabpanel"
          id={`${id}-panel-${panel.id}`}
          aria-labelledby={`${id}-tab-${panel.id}`}
          hidden={active !== panel.id}
          className={active === panel.id ? ui.page : "tw:hidden"}
        >
          {panel.content}
        </div>
      ))}
    </div>
  );
}
