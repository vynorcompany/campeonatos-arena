"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

export type PortalThemePreference = "light" | "dark" | "system";
const ThemeContext = createContext<{
  theme: PortalThemePreference;
  choose: (theme: PortalThemePreference) => void;
} | null>(null);
const options = [
  { value: "light", label: "Diurno" },
  { value: "dark", label: "Noturno" },
  { value: "system", label: "Automático" },
] as const;

export function PortalThemeProvider({
  initialTheme,
  children,
  className,
}: {
  initialTheme: PortalThemePreference;
  children: React.ReactNode;
  className: string;
}) {
  const [theme, setTheme] = useState(initialTheme);
  // Floating dialogs render under body; restore its previous scope when leaving the Portal.
  useEffect(() => {
    const previous = document.body.getAttribute("data-portal-theme");
    document.body.setAttribute("data-portal-theme", theme);
    return () => {
      if (previous === null) document.body.removeAttribute("data-portal-theme");
      else document.body.setAttribute("data-portal-theme", previous);
    };
  }, [theme]);
  function choose(value: PortalThemePreference) {
    setTheme(value);
    document.cookie = `arena_portal_theme=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  }
  return (
    <ThemeContext.Provider value={{ theme, choose }}>
      <div data-portal-theme={theme} className={className}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function PortalThemeToggle() {
  const context = useContext(ThemeContext);
  const root = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node))
        root.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && root.current?.open) {
        root.current.open = false;
        root.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  if (!context) return null;
  const label = options.find((option) => option.value === context.theme)!.label;
  return (
    <details ref={root} className="tw:relative tw:shrink-0">
      <summary
        aria-label={`Tema do portal: ${label}`}
        title={`Tema do portal: ${label}`}
        className="tw:grid tw:size-10 tw:cursor-pointer tw:list-none tw:place-items-center tw:rounded-xl tw:border tw:border-[var(--portal-line)] tw:bg-[var(--portal-surface)] tw:text-[var(--portal-ink)] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#1e5ea8] tw:[&::-webkit-details-marker]:hidden"
      >
        <svg
          className="tw:size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
        </svg>
      </summary>
      <div
        role="group"
        aria-label="Tema do portal"
        className="tw:absolute tw:right-0 tw:top-full tw:z-50 tw:mt-2 tw:grid tw:w-40 tw:gap-1 tw:rounded-xl tw:border tw:border-[var(--portal-line)] tw:bg-[var(--portal-surface)] tw:p-1.5 tw:text-[var(--portal-ink)] tw:shadow-lg"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={context.theme === option.value}
            onClick={() => {
              context.choose(option.value);
              if (root.current) {
                root.current.open = false;
                root.current.querySelector("summary")?.focus();
              }
            }}
            className={`tw:flex tw:min-h-10 tw:cursor-pointer tw:items-center tw:justify-between tw:rounded-lg tw:border-0 tw:px-3 tw:text-sm tw:font-normal tw:focus-visible:outline-2 tw:focus-visible:outline-[#1e5ea8] ${context.theme === option.value ? "tw:bg-[#174983] tw:text-white" : "tw:bg-transparent tw:text-inherit tw:hover:bg-[#174983] tw:hover:text-white"}`}
          >
            {option.label}
            <span aria-hidden="true">
              {context.theme === option.value ? "✓" : ""}
            </span>
          </button>
        ))}
      </div>
    </details>
  );
}
