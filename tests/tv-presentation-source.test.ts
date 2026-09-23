import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("TV tournament source is arena-scoped, selected explicitly and excludes finished games", () => {
  const schema = source("prisma/schema.prisma");
  const action = source("src/lib/actions/upcoming-match.ts");
  const service = source("src/lib/services/tv-presentation.ts");
  const fields = source("src/components/tv-match-source-fields.tsx");

  assert.match(schema, /tvSourceTournamentId\s+String\?/);
  assert.match(action, /Selecione o torneio cujos jogos serão exibidos na TV/);
  assert.match(action, /id: parsed\.data\.tvSourceTournamentId, arenaId: auth\.arenaId/);
  assert.match(service, /getTournamentUpcomingMatchesPayload\(arenaId, settings\.tvSourceTournamentId/);
  assert.match(service, /id: tournamentId,\s+arenaId/);
  assert.match(service, /getMatchDisplayStatus\(match\) !== "FINISHED"/);
  assert.match(fields, /name="tvSourceTournamentId"/);
});

test("manual TV games use a separate modal form and the shared composer keeps the sidebar scrollable", () => {
  const fields = source("src/components/tv-match-source-fields.tsx");
  const css = source("src/app/globals.css");
  const chat = source("src/components/whatsapp/whatsapp-chat-workspace.tsx");

  assert.match(fields, /createPortal/);
  assert.match(fields, /createManualUpcomingMatchAction/);
  assert.match(fields, /role="dialog"/);
  assert.match(css, /\.app-shell:has\(\.whatsapp-page\) > \.sidebar/);
  assert.match(css, /overflow-y: auto/);
  assert.match(chat, /form className="whatsapp-composer"/);
});

test("athlete-facing league menu is titled Torneios and admin panels share breadcrumb styling", () => {
  const standings = source("src/components/tournaments/public-standings.tsx");
  const breadcrumb = source("src/components/layout/page-breadcrumb.tsx");
  assert.match(standings, /label: "Torneios"/);
  assert.match(standings, /<strong>Torneios<\/strong>/);
  assert.match(breadcrumb, /path\.startsWith\("\/financeiro"\)/);
  assert.match(breadcrumb, /path\.startsWith\("\/relatorios"\)/);
});
