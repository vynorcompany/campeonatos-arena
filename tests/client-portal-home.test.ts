import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("client portal opens on Home with arena notices, client summary and featured events", () => {
  const page = read("src/app/classificacao/[arenaSlug]/page.tsx");
  const portal = read("src/components/tournaments/public-standings.tsx");
  const home = read("src/lib/services/public-client-home.ts");
  const schema = read("prisma/schema.prisma");

  assert.match(page, /getPublicClientHome/);
  assert.match(page, /: "home"/);
  assert.match(portal, /Início/);
  assert.match(portal, /ClientHomePanel/);
  assert.match(portal, /Resumo da sua situação/);
  assert.match(portal, /Eventos próximos/);
  assert.match(home, /portalAnnouncement\.findMany/);
  assert.match(home, /featuredInPortal: true/);
  assert.match(schema, /model PortalAnnouncement \{/);
  assert.match(schema, /featuredInPortal\s+Boolean\s+@default\(false\)/);
});

test("arena has a dedicated page to publish portal notices and feature upcoming events", () => {
  const settings = read("src/app/(app)/arena/portal-cliente/page.tsx");
  const actions = read("src/lib/actions/client-portal.ts");
  const shell = read("src/components/layout/app-shell.tsx");

  assert.match(settings, /Avisos para o portal/);
  assert.match(settings, /Eventos em destaque/);
  assert.match(actions, /createPortalAnnouncementAction/);
  assert.match(actions, /togglePortalEventFeatureAction/);
  assert.match(shell, /\/arena\/portal-cliente/);
});

test("league header no longer displays the isolated notification count tag", () => {
  const portal = read("src/components/tournaments/public-league-portal.tsx");

  assert.doesNotMatch(portal, /notificação\{portal\.leagueNotifications\.length/);
});
