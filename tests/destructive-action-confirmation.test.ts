import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

function tsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? tsxFiles(path) : entry.name.endsWith(".tsx") ? [path] : [];
  });
}

test("ações de excluir e remover exigem o modal compartilhado de confirmação", () => {
  const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));
  const violations: string[] = [];
  let checked = 0;

  for (const file of tsxFiles(sourceRoot)) {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
      if (ts.isJsxOpeningElement(node)) {
        const tag = node.tagName.getText(source);
        if (tag === "form" || tag === "SafeActionForm") {
          const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
          const action = attributes.find((attribute) => attribute.name.getText(source) === "action")?.getText(source) ?? "";
          if (/\b(?:delete|remove)\w*Action\b/.test(action)) {
            checked += 1;
            if (tag !== "SafeActionForm" || !attributes.some((attribute) => attribute.name.getText(source) === "confirmKeyword")) {
              const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
              violations.push(`${file}:${line}`);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  assert.ok(checked > 0, "Nenhuma ação destrutiva foi encontrada para verificar.");
  assert.deepEqual(violations, [], `Exclusões sem confirmação compartilhada: ${violations.join(", ")}`);
});
