/**
 * Characterization tests historically load a complete action/service with VM mocks.
 * Resolve its public facade to the actual domain sources without changing those mocks.
 * Runtime wiring is tested separately by the production build and browser/database suite.
 */
import { readFileSync as readOriginal } from "node:fs";
import { readFile as readOriginalAsync } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";
import { readFileSync as readStyledOriginal, readFile as readStyledOriginalAsync } from "./style-source";

const domains = new Set([
  "src/lib/actions/tournament.ts", "src/lib/actions/academy.ts", "src/lib/actions/finance.ts", "src/lib/actions/calendar.ts",
  "src/lib/services/tournament.ts", "src/lib/services/category-competition.ts",
]);

// Characterization follows the business implementation; facade transport has
// separate contract/HTTP tests and must never be mistaken for domain execution.
const backendDomains = new Map([
  [path.resolve('src/lib/actions/printer-settings.ts'), path.resolve('src/lib/backend/services/printer-settings-actions.ts')],
  [path.resolve('src/lib/actions/cancellation-policy.ts'), path.resolve('src/lib/backend/services/cancellation-policy-actions.ts')],
  [path.resolve('src/lib/actions/privacy-management.ts'), path.resolve('src/lib/backend/services/privacy-management-actions.ts')],
  [path.resolve('src/lib/actions/devices.ts'), path.resolve('src/lib/backend/services/devices-actions.ts')],

  [path.resolve('src/lib/actions/boleto-queue.ts'), path.resolve('src/lib/backend/services/boleto-queue-actions.ts')],
  [path.resolve('src/lib/actions/fiscal.ts'), path.resolve('src/lib/backend/services/nfe-import.ts')],
  [path.resolve('src/lib/actions/cash-register.ts'), path.resolve('src/lib/backend/services/cash-register.ts')],
  [path.resolve('src/lib/actions/pos.ts'), path.resolve('src/lib/backend/services/products-pos.ts')],
  [path.resolve('src/lib/actions/product-fiscal.ts'), path.resolve('src/lib/backend/services/products-fiscal.ts')],
  [path.resolve('src/lib/actions/services.ts'), path.resolve('src/lib/backend/services/products-services.ts')],
  [path.resolve('src/lib/actions/standard-service-prices.ts'), path.resolve('src/lib/backend/services/products-standard-service-prices.ts')],
  [path.resolve('src/lib/actions/class-groups.ts'), path.resolve('src/lib/backend/services/class-groups.ts')],
  [path.resolve('src/lib/actions/lesson-credit-settings.ts'), path.resolve('src/lib/backend/services/lesson-credit-settings.ts')],
  [path.resolve('src/lib/actions/academy/students.ts'), path.resolve('src/lib/backend/services/academy-students.ts')],
  [path.resolve('src/lib/actions/academy/teachers.ts'), path.resolve('src/lib/backend/services/academy-teachers.ts')],
  [path.resolve('src/lib/actions/academy/groups.ts'), path.resolve('src/lib/backend/services/academy-groups.ts')],
  [path.resolve('src/lib/actions/academy/plans.ts'), path.resolve('src/lib/backend/services/academy-plans.ts')],
  [path.resolve('src/lib/actions/academy/lessons.ts'), path.resolve('src/lib/backend/services/academy-lessons.ts')],

  [path.resolve('src/lib/actions/finance/subscriptions.ts'), path.resolve('src/lib/backend/services/financial-subscriptions-actions.ts')],
  [path.resolve('src/lib/actions/finance/payroll.ts'), path.resolve('src/lib/backend/services/financial-payroll-actions.ts')],

  [path.resolve('src/lib/actions/finance/settings.ts'), path.resolve('src/lib/backend/services/financial-settings-actions.ts')],
  [path.resolve('src/lib/actions/finance/ledger.ts'), path.resolve('src/lib/backend/services/financial-actions.ts')],
  [path.resolve('src/lib/actions/tournament/players.ts'), path.resolve('src/lib/backend/services/players.ts')],
  [path.resolve('src/lib/actions/client-management.ts'), path.resolve('src/lib/backend/services/client-management.ts')],
]);
export function domainSource(filename: string): string {
  const root = path.resolve(filename), directory = root.replace(/\.ts$/, "");
  const visited = new Set<string>(), bodies: string[] = [], imports = new Map<string, { default?: string; namespace?: string; named: Map<string, string> }>();
  const externalExports: string[] = [];
  function visit(file: string) {
    file = backendDomains.get(file) ?? file;
    if (visited.has(file)) return;
    visited.add(file);
    const text = readOriginal(file, "utf8");
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const local = (name: string) => name.startsWith("@/") ? path.resolve("src", name.slice(2)) + ".ts" : path.resolve(path.dirname(file), name) + ".ts";
    const internal = (name: string) => (name.startsWith("@/") || name.startsWith(".")) && (local(name).startsWith(directory + path.sep) || ["src/lib/backend/product-operation-error.ts", "src/lib/backend/client-operation-error.ts", "src/lib/backend/academy-operation-error.ts", "src/lib/finance/action-error.ts"].some(file => local(name) === path.resolve(file)));
    for (const statement of source.statements) {
      if ((ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier) && internal(statement.moduleSpecifier.text)) visit(local(statement.moduleSpecifier.text));
    }
    for (const statement of source.statements) {
      if (ts.isImportDeclaration(statement)) {
        const name = (statement.moduleSpecifier as ts.StringLiteral).text;
        if (internal(name) || name === "server-only") continue;
        const item = imports.get(name) ?? { named: new Map<string, string>() };
        const clause = statement.importClause;
        if (clause?.name) item.default = clause.name.text;
        if (clause?.namedBindings) {
          if (ts.isNamespaceImport(clause.namedBindings)) item.namespace = clause.namedBindings.name.text;
          else for (const specifier of clause.namedBindings.elements) item.named.set(specifier.name.text, specifier.propertyName?.text ?? specifier.name.text);
        }
        imports.set(name, item);
        continue;
      }
      if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
        if (!internal(statement.moduleSpecifier.text)) externalExports.push(statement.getText(source));
        continue;
      }
      if (ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression) && statement.expression.text === "use server") continue;
      bodies.push(statement.getFullText(source).trim());
    }
  }
  visit(root);
  const declarations: string[] = [];
  for (const [name, item] of imports) {
    const named = [...item.named].map(([local, imported]) => imported === local ? local : `${imported} as ${local}`);
    if (item.namespace) declarations.push(`import * as ${item.namespace} from ${JSON.stringify(name)};`);
    const bindings = [item.default, named.length ? `{ ${named.join(", ")} }` : undefined].filter(Boolean);
    if (bindings.length) declarations.push(`import ${bindings.join(", ")} from ${JSON.stringify(name)};`);
    else if (!item.namespace) declarations.push(`import ${JSON.stringify(name)};`);
  }
  return ['"use server";', ...declarations, ...bodies, ...externalExports].join("\n\n");
}

function modularPath(file: unknown): string | null {
  const value = file instanceof URL ? fileURLToPath(file) : typeof file === "string" ? file : null;
  if (!value) return null;
  const relative = path.relative(process.cwd(), path.resolve(value)).replaceAll(path.sep, "/");
  if (backendDomains.has(path.resolve(value))) return value;
  if (!domains.has(relative)) return null;
  // Keeps the helper useful before and after the extraction, without following arbitrary modules.
  return /Public entry point/.test(readOriginal(value, "utf8")) ? value : null;
}
export const readFileSync: typeof readOriginal = ((file: unknown, options: unknown) => {
  const resolved = modularPath(file);
  if (resolved && (options === "utf8" || options === "utf-8")) return domainSource(resolved);
  return (readOriginal as Function)(file, options);
}) as typeof readOriginal;

export const readFile: typeof readOriginalAsync = (async (file: unknown, options: unknown) => {
  const resolved = modularPath(file);
  if (resolved && (options === "utf8" || options === "utf-8")) return domainSource(resolved);
  return (readOriginalAsync as Function)(file, options);
}) as typeof readOriginalAsync;

export const readStyledFileSync: typeof readOriginal = ((file: unknown, options: unknown) => {
  const resolved = modularPath(file);
  if (resolved && (options === "utf8" || options === "utf-8")) return domainSource(resolved);
  return (readStyledOriginal as Function)(file, options);
}) as typeof readOriginal;

export const readStyledFile: typeof readOriginalAsync = (async (file: unknown, options: unknown) => {
 const resolved = modularPath(file);
 if (resolved && (options === "utf8" || options === "utf-8")) return domainSource(resolved);
 return (readStyledOriginalAsync as Function)(file, options);
}) as typeof readOriginalAsync;
