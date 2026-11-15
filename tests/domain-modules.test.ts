import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const domains = ["actions/tournament", "actions/academy", "actions/finance", "actions/calendar", "services/tournament", "services/category-competition"];
for (const domain of domains) {
  test(`${domain} exposes named operations through bounded domain modules`, () => {
    const file = path.resolve("src/lib", domain + ".ts");
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    let operations = 0;
    for (const statement of source.statements) {
      if (ts.isExpressionStatement(statement)) continue;
      assert.ok(ts.isExportDeclaration(statement), "The entry point must not accumulate business logic again.");
      assert.ok(statement.exportClause && ts.isNamedExports(statement.exportClause), "Expose explicit operations, not every internal helper.");
      if (!statement.isTypeOnly) operations += statement.exportClause.elements.length;
    }
    assert.ok(operations > 0);
    const directory = file.replace(/\.ts$/, "");
    for (const entry of readdirSync(directory)) {
      if (!entry.endsWith(".ts")) continue;
      const contents = readFileSync(path.join(directory, entry), "utf8");
      assert.ok(contents.split("\n").length <= 850, `${domain}/${entry} is growing beyond a reviewable module.`);
      if (domain.startsWith("actions/") && entry !== "shared.ts") {
        const module = ts.createSourceFile(entry, contents, ts.ScriptTarget.Latest, true);
        for (const declaration of module.statements.filter(ts.isFunctionDeclaration)) {
          assert.ok(declaration.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword), "Server actions must remain asynchronous.");
        }
      }
    }
  });
}
