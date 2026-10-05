import * as fs from "node:fs";
import ts from "typescript";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const memory = new Map<string, string>();
let sharedSources: Map<string, string> | undefined;
function scopedUtilitySource(file: string) {
  if (!fs.existsSync(file)) return "";
  const source = fs.readFileSync(file, "utf8");
  const references = [...source.matchAll(/sharedUtilities\.(\w+)/g)].map(match => match[1]);
  if (references.length && !sharedSources) {
    sharedSources = new Map();
    const tree = ts.createSourceFile("shared.utilities.ts", fs.readFileSync(resolve("src/components/ui/shared.utilities.ts"), "utf8"), ts.ScriptTarget.Latest, true);
    const scan = (node: ts.Node) => {
      if (ts.isPropertyAssignment(node)) sharedSources!.set(node.name.getText(tree), node.getText(tree));
      ts.forEachChild(node, scan);
    };
    scan(tree);
  }
  return source + references.map(name => sharedSources?.get(name) ?? "").join("\n");
}
function sourceFingerprint(directory: string, hash: ReturnType<typeof createHash>) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) sourceFingerprint(file, hash);
    else if (/\.(?:tsx?|css)$/.test(file)) hash.update(file).update(fs.readFileSync(file));
  }
}

function compiledStyles(file: string, source: string) {
  if (memory.has(file)) return memory.get(file)!;
  const hash = createHash("sha256").update(process.cwd()).update(source).update(fs.readFileSync(resolve("package-lock.json"))).update(fs.readFileSync(resolve("scripts/compile-styles-for-tests.mjs")));
  sourceFingerprint(resolve("src"), hash);
  const key = hash.digest("hex");
  const cache = join(tmpdir(), `arena-tailwind-tests-${key}.css`);
  let compiled: string;
  if (fs.existsSync(cache)) compiled = fs.readFileSync(cache, "utf8");
  else {
    compiled = execFileSync(process.execPath, [resolve("scripts/compile-styles-for-tests.mjs"), file], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    fs.writeFileSync(cache, compiled);
  }
  memory.set(file, compiled);
  return compiled;
}

/** Read component source together with colocated literal utilities; CSS checks inspect the actual Tailwind output. */
export const readFileSync: typeof fs.readFileSync = ((file: fs.PathOrFileDescriptor, options?: any) => {
  const path = file instanceof URL ? fileURLToPath(file) : typeof file === "string" ? file : "";
  if (!path.endsWith(".css")) {
    if (path.endsWith(".tsx") && (typeof options === "string" || options?.encoding)) {
      const utilities = path.replace(/\.tsx$/, ".utilities.ts");
      return fs.readFileSync(file, options) + (fs.existsSync(utilities) ? "\n" + scopedUtilitySource(utilities) : "");
    }
    return fs.readFileSync(file, options);
  }
  const source = fs.readFileSync(file, "utf8");
  const result = /@apply|@import\s+["']tailwindcss/.test(source) ? compiledStyles(resolve(path), source) : source;
  return typeof options === "string" || options?.encoding ? result : Buffer.from(result);
}) as typeof fs.readFileSync;

export const readFile: typeof fs.promises.readFile = (async (file: fs.PathLike, options?: any) => readFileSync(file, options)) as typeof fs.promises.readFile;
