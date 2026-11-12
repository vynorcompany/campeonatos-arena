"use client";
import { useId, useState, type ReactNode, type KeyboardEvent } from "react";
import { cx } from "@/lib/ui/classes";
import { EventIcon } from "@/components/tournaments/event-icon";
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
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? panels.length - 1
          : (index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) + panels.length) %
            panels.length;
    select(panels[next].id);
    document.getElementById(`${id}-tab-${panels[next].id}`)?.focus();
  }
  return (
    <div className="tw:grid tw:min-w-0 tw:items-start tw:gap-4 tw:md:grid-cols-[176px_minmax(0,1fr)]">
      <div
        role="tablist"
        aria-label="Edição do produto"
        className="tw:grid tw:min-w-0 tw:grid-cols-2 tw:gap-1 tw:rounded-md tw:border tw:border-[#d4e0ee] tw:bg-[#f5f8fc] tw:p-1.5 tw:md:sticky tw:md:top-4 tw:md:flex tw:md:flex-col"
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
            className={cx(active === panel.id ? ui.primary : ui.secondary, "tw:shrink-0 tw:justify-start! tw:gap-2! tw:whitespace-nowrap tw:w-full!", active !== panel.id && "tw:border-transparent! tw:bg-transparent!")}
          >
            <EventIcon name={panel.id === "dados" ? "edit" : panel.id === "composicao" ? "sliders" : panel.id === "estoque" ? "clipboard" : "info"}/>{panel.label}
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
          className={active === panel.id ? "tw:min-w-0 tw:rounded-md tw:border tw:border-[#d4e0ee] tw:bg-white tw:p-4 tw:md:col-start-2 tw:md:row-start-1 tw:[&_section]:border-0! tw:[&_section]:shadow-none! tw:[&_section]:p-0!" : "tw:hidden"}
        >
          {panel.content}
        </div>
      ))}
    </div>
  );
}
