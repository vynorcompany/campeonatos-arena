// Run manually to refresh the official NCM and IBS/CBS digital catalogs.
// Paraná's independently versioned PDF cBenef table requires a separate reviewed update.
import { readFile, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const directory = new URL("../src/lib/fiscal/catalog/", import.meta.url);
async function fetchText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok)
    throw new Error(`Official catalog returned HTTP ${response.status}`);
  return response.text();
}
async function persist(name, data) {
  const file = new URL(name, directory),
    temporary = fileURLToPath(file) + ".tmp";
  await writeFile(temporary, JSON.stringify(data) + "\n");
  await rename(temporary, file);
  console.log(`${name}: ${data.rows.length} records`);
}
function embeddedJson(text, marker) {
  const start = text.indexOf(marker);
  if (start < 0)
    throw new Error(
      "Official RTC data marker changed; review the source before updating.",
    );
  const rest = text.slice(start + marker.length).trimStart();
  let depth = 0,
    quoted = false,
    escaped = false;
  for (let i = 0; i < rest.length; i++) {
    const char = rest[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === "[" || char === "{") depth++;
    else if (char === "]" || char === "}") depth--;
    if (depth === 0) return JSON.parse(rest.slice(0, i + 1));
  }
  throw new Error("Incomplete official RTC JSON.");
}
const previousNcm = JSON.parse(
  await readFile(new URL("ncm.json", directory), "utf8"),
);
const ncm = JSON.parse(await fetchText(previousNcm.source));
if (!Array.isArray(ncm.Nomenclaturas) || !ncm.Data_Ultima_Atualizacao_NCM)
  throw new Error("NCM source format changed.");
const nodes = new Map(
  ncm.Nomenclaturas.map((row) => [row.Codigo.replace(/\D/g, ""), row]),
);
const clean = (value) =>
  value
    .replace(/<[^>]*>/g, "")
    .replace(
      /&(?:amp|quot|apos|lt|gt|nbsp);/g,
      (entity) =>
        ({
          "&amp;": "&",
          "&quot;": '"',
          "&apos;": "'",
          "&lt;": "<",
          "&gt;": ">",
          "&nbsp;": " ",
        })[entity],
    )
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) =>
      String.fromCodePoint(
        code[0].toLowerCase() === "x"
          ? parseInt(code.slice(1), 16)
          : Number(code),
      ),
    )
    .replace(/^[\s-]+/, "")
    .trim();
const ncmRows = [...nodes]
  .filter(([code]) => code.length === 8)
  .map(([code, row]) => ({
    code,
    label: [
      ...new Set(
        [2, 4, 6, 8]
          .filter((length) => nodes.has(code.slice(0, length)))
          .map((length) => clean(nodes.get(code.slice(0, length)).Descricao)),
      ),
    ].join(" › "),
    start: row.Data_Inicio,
    end: row.Data_Fim,
  }));
if (
  ncmRows.length < 8000 ||
  ncmRows.some(
    (row) =>
      !/^\d{2}\/\d{2}\/\d{4}$/.test(row.start) ||
      !/^\d{2}\/\d{2}\/\d{4}$/.test(row.end),
  )
)
  throw new Error("NCM catalog failed integrity checks.");
const previousRtc = JSON.parse(
  await readFile(new URL("ibs-cbs.json", directory), "utf8"),
);
const groups = embeddedJson(
  await fetchText(previousRtc.source),
  "var dadosOriginais = ",
);
const rtcRows = groups.flatMap((group) =>
  (group.ClassificacoesTributarias ?? []).map((row) => ({
    cst: group.Cst,
    cstLabel: group.NomeCst,
    code: row.CodClassTrib,
    label: row.NomeClassTrib,
    nfce: Boolean(row.IndNfce),
    start: row.DthIniVig,
    end: row.DthFimVig,
  })),
);
if (
  rtcRows.length < 100 ||
  rtcRows.some((row) => !/^\d{6}$/.test(row.code) || !/^\d{3}$/.test(row.cst))
)
  throw new Error("RTC catalog failed integrity checks.");
await persist("ncm.json", {
  source: previousNcm.source,
  version: ncm.Data_Ultima_Atualizacao_NCM,
  act: ncm.Ato ?? "",
  rows: ncmRows,
});
await persist("ibs-cbs.json", {
  source: previousRtc.source,
  checkedAt: new Date().toISOString().slice(0, 10),
  rows: rtcRows,
});
