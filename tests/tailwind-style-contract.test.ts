import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import postcss, { type Node } from "postcss";

test("system and portal styles use Tailwind; raw CSS is reserved for tokens and keyframes", () => {
  const files: string[] = [];
  function collect(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) collect(file);
      else files.push(file);
    }
  }
  collect("src");
  assert.equal(files.filter(file => file.endsWith(".module.css")).length, 0);
  for (const file of files.filter(file => file.endsWith(".css"))) {
    postcss.parse(readFileSync(file, "utf8")).walkDecls(declaration => {
      if (declaration.prop.startsWith("--")) return;
      let parent: Node | undefined = declaration.parent;
      while (parent) {
        if (parent.type === "atrule" && "name" in parent && typeof parent.name === "string" && /keyframes$/.test(parent.name)) return;
        parent = parent.parent;
      }
      assert.fail(`${file}: ${declaration.prop} must use a Tailwind utility.`);
    });
  }
  for (const file of files.filter(file => /\.tsx?$/.test(file))) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /import\s+.*["'][^"']+\.module\.css["']/);
  }
});
