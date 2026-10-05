import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import postcss from "postcss";
import ts from "typescript";
import { readFileSync as readStyleSource } from "./style-source";

let utilityIndex: Map<string, Set<string>> | undefined;
let compiledIndex: Map<string, { selector: string; css: string; maxWidth?: number }[]> | undefined;

/** Inspect the literal utilities owned by components, without recreating legacy CSS selectors. */
export function utilityClasses(marker: string): string[] {
  if (!utilityIndex) {
    utilityIndex = new Map();
    const collect = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const file = join(directory, entry.name);
        if (entry.isDirectory()) collect(file);
        else if (/\.(utilities|styles)\.ts$/.test(file)) {
          const tree = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
          const scan = (node: ts.Node) => {
            if (ts.isArrayLiteralExpression(node)) {
              const words = node.elements.filter(ts.isStringLiteral).flatMap(value => value.text.split(/\s+/));
              const utilities = words.filter(word => word.startsWith("tw:"));
              const names = new Set(words.filter(word => !word.startsWith("tw:")));
              for (const name of names) {
                const values = utilityIndex!.get(name) ?? new Set<string>();
                utilities.forEach(value => values.add(value));
                utilityIndex!.set(name, values);
              }
              for (const value of utilities) {
                for (const match of value.matchAll(/\.([a-zA-Z][\w-]*)/g)) {
                  const values = utilityIndex!.get(match[1]) ?? new Set<string>();
                  values.add(value);
                  utilityIndex!.set(match[1], values);
                }
              }
            }
            ts.forEachChild(node, scan);
          };
          scan(tree);
        }
      }
    };
    collect(resolve("src"));
  }
  return [...(utilityIndex.get(marker) ?? [])];
}

/** Return only actual compiled Tailwind rules referenced by the selected component utilities. */
export function styleRules(marker: string, options: { context?: string; maxWidth?: number } = {}) {
  if (!compiledIndex) {
    compiledIndex = new Map();
    const tree = postcss.parse(readStyleSource(resolve("src/app/globals.css"), "utf8"));
    tree.walkRules(rule => {
      let maxWidth: number | undefined;
      for (let parent = rule.parent; parent; parent = parent.parent as typeof parent) {
        if (parent.type === "atrule" && parent.name === "media") {
          const match = parent.params.match(/max-width:\s*(\d+)px/);
          if (match) maxWidth = +match[1];
        }
      }
      for (const match of rule.selector.matchAll(/\.((?:\\.|[\w-])+)/g)) {
        const candidate = match[1].replace(/\\(.)/g, "$1");
        if (!candidate.startsWith("tw:")) continue;
        const rules = compiledIndex!.get(candidate) ?? [];
        rules.push({ selector: rule.selector, css: rule.toString(), maxWidth });
        compiledIndex!.set(candidate, rules);
      }
    });
  }
  return utilityClasses(marker).flatMap(candidate => compiledIndex!.get(candidate) ?? [])
    .filter(rule => options.maxWidth === undefined || rule.maxWidth === options.maxWidth)
    .filter(rule => !options.context || (rule.selector.includes(options.context) || rule.css.includes(options.context)))
    .map(rule => rule.css).join("\n");
}
