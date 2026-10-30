import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
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
    assert.equal(file, join("src", "app", "globals.css"), "Only Tailwind infrastructure has a stylesheet.");
    const sheet = postcss.parse(readFileSync(file, "utf8"));
    const imports = sheet.nodes.filter(node => node.type === "atrule" && node.name === "import");
    assert.deepEqual(imports.map(node => "params" in node ? node.params : ""), [
      '"tailwindcss/theme.css" layer(theme) prefix(tw)',
      '"tailwindcss/utilities.css" layer(utilities) prefix(tw)',
    ], "Both Tailwind entrypoints must remain separate, valid imports.");
    sheet.walkAtRules("apply", () => assert.fail(`${file}: component styles belong in JSX utilities.`));
    sheet.walkRules(rule => {
      let ancestor: Node | undefined = rule.parent;
      while (ancestor) { if (ancestor.type === "atrule" && "name" in ancestor && ancestor.name === "custom-variant") { assert.ok(rule.selector.startsWith("&"), "Variant selectors must stay relative."); return; } ancestor = ancestor.parent; }
      if (rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name)) return;
      assert.equal(rule.selector, ":root", `${file}: presentation selectors must not return.`);
      for (const declaration of rule.nodes) {
        assert.equal(declaration.type, "decl");
        if (declaration.type === "decl") assert.ok(declaration.prop.startsWith("--"));
      }
    });
    sheet.walkDecls(declaration => {
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


test("shared surfaces stay white and Arena blues retain readable white labels", () => {
  const sheet = postcss.parse(readFileSync("src/app/globals.css", "utf8"));
  const tokens = new Map<string, string>();
  sheet.walkDecls(declaration => { if (declaration.parent?.type === "rule" && declaration.parent.selector === ":root") tokens.set(declaration.prop, declaration.value); });
  for (const name of ["--bg", "--panel", "--panel-muted"]) assert.match(tokens.get(name) ?? "", /^#(?:fff|ffffff)$/i, `${name}: content surfaces must be white`);
  assert.equal(tokens.get("--brand"), "#1e5ea8");
  assert.equal(tokens.get("--brand-strong"), "#174983");
  const luminance = (hex: string) => {
    const rgb = hex.replace("#", "").match(/../g)!.map(value => { const channel = parseInt(value, 16) / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; });
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  for (const name of ["--brand", "--brand-strong"]) assert.ok(1.05 / (luminance(tokens.get(name)!) + .05) >= 4.5, `${name}: white labels need AA contrast`);
});
