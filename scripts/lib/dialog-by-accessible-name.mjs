/** Runs in the browser; supports both explicit labels and labelled dialog headings. */
export function dialogByAccessibleName(name, prefix = false) {
  return [...document.querySelectorAll('[role="dialog"]')].find(dialog => {
    const heading = (dialog.getAttribute("aria-labelledby") ?? "")
      .split(/\s+/).filter(Boolean)
      .map(id => document.getElementById(id)?.textContent ?? "")
      .join(" ").trim();
    const label = heading || dialog.getAttribute("aria-label") || "";
    const normalized = label.replace(/\s+/g, " ").trim();
    return prefix ? normalized.startsWith(name) : normalized === name;
  }) ?? null;
}
