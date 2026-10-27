import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(file) : /\.(tsx?|jsx?)$/.test(file) ? [file] : [];
  });
}

test("source modules have no runtime import cycles", () => {
  const root = path.resolve("src");
  const graph = new Map<string, string[]>();
  for (const file of sourceFiles(root)) {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const imports: string[] = [];
    for (const node of source.statements) {
      if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) continue;
      if (ts.isExportDeclaration(node) && node.isTypeOnly) continue;
      if (ts.isImportDeclaration(node)) {
        const clause = node.importClause;
        if (clause?.isTypeOnly) continue;
        if (clause && !clause.name && clause.namedBindings && ts.isNamedImports(clause.namedBindings) && clause.namedBindings.elements.length && clause.namedBindings.elements.every(item => item.isTypeOnly)) continue;
      }
      if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) continue;
      const name = node.moduleSpecifier.text;
      const base = name.startsWith("@/") ? path.join(root, name.slice(2)) : name.startsWith(".") ? path.resolve(path.dirname(file), name) : null;
      if (!base) continue;
      const resolved = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")].find(candidate => /\.(tsx?|jsx?)$/.test(candidate) && existsSync(candidate));
      if (resolved) imports.push(resolved);
    }
    graph.set(file, imports);
  }
  const visited = new Set<string>();
  const stack: string[] = [];
  function visit(file: string) {
    assert.ok(!stack.includes(file), `Circular module dependency: ${[...stack, file].map(item => path.relative(root, item)).join(" -> ")}`);
    if (visited.has(file)) return;
    stack.push(file);
    for (const dependency of graph.get(file) ?? []) visit(dependency);
    stack.pop(); visited.add(file);
  }
  for (const file of graph.keys()) visit(file);
});

test("server integrations declare cancellation or use the shared request deadline", () => {
  const unbounded: string[] = [];
  for (const file of [...sourceFiles("src/lib"), ...sourceFiles("src/app/api")]) {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    function inspect(node: ts.Node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "fetch") {
        const options = node.arguments[1];
        if (!options || !ts.isObjectLiteralExpression(options) || !options.properties.some(property => ts.isPropertyAssignment(property) && property.name.getText(source) === "signal")) {
          unbounded.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`);
        }
      }
      ts.forEachChild(node, inspect);
    }
    inspect(source);
  }
  assert.deepEqual(unbounded, [], "Use fetchWithDeadline or provide a bounded AbortSignal for server network calls");
});
