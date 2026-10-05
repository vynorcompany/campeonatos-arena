import { extendTailwindMerge } from "tailwind-merge";

/** Resolve component defaults and caller overrides using the project's Tailwind v4 prefix. */
export const cx = extendTailwindMerge({ prefix: "tw", override: { conflictingClassGroups: { "font-size": [] } } });
