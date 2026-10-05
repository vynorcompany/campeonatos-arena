import { readFileSync } from "node:fs";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const file = process.argv[2];
if (!file) throw new Error("Provide a stylesheet path.");
const result = await postcss([tailwind({ base: process.cwd(), optimize: false })]).process(readFileSync(file, "utf8"), { from: file });
// Keep layout assertions focused on the resulting selectors and declarations.
const tree = postcss.parse(result.css);
tree.walkRules((rule) => { rule.raws.before = "\n"; rule.raws.between = " "; rule.raws.after = " "; });
tree.walkDecls((declaration) => { declaration.raws.before = " "; declaration.raws.between = ": "; });
process.stdout.write(tree.toString());
