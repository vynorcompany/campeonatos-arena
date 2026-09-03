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
  const editor = read("src/components/portal-editor-panels.tsx");
  const actions = read("src/lib/actions/client-portal.ts");
  const shell = read("src/components/layout/app-shell.tsx");

  assert.match(settings, /PortalEditorPanels/);
  assert.match(editor, /Avisos para o portal/);
  assert.match(editor, /Eventos em destaque/);
  assert.match(actions, /createPortalAnnouncementAction/);
  assert.match(actions, /togglePortalEventFeatureAction/);
  assert.match(shell, /\/arena\/portal-cliente/);
});

test("portal management keeps editorial forms in dialogs and publishes vertical event posts", () => {
  const editor = read("src/components/portal-editor-panels.tsx");
  const actions = read("src/lib/actions/client-portal.ts");
  const schema = read("prisma/schema.prisma");
  const home = read("src/lib/services/public-client-home.ts");
  const portal = read("src/components/tournaments/public-standings.tsx");

  assert.match(editor, /Novo aviso/);
  assert.match(editor, /Novo evento/);
  assert.match(editor, /accept="image\/\*"/);
  assert.match(actions, /createPortalEventPostAction/);
  assert.match(schema, /model PortalEventPost \{/);
  assert.match(home, /portalEventPost\.findMany/);
  assert.match(portal, /PortalRichText/);
});

test("league header no longer displays the isolated notification count tag", () => {
  const portal = read("src/components/tournaments/public-league-portal.tsx");

  assert.doesNotMatch(portal, /notificação\{portal\.leagueNotifications\.length/);
});

test("portal header presents only the athlete name with an integrated larger avatar", () => {
  const portal = read("src/components/tournaments/public-standings.tsx");
  const styles = read("src/app/globals.css");

  assert.match(portal, /\{currentClient\.name\}/);
  assert.doesNotMatch(portal, /Olá, \{currentClient\.name\}/);
  assert.match(styles, /\.athlete-portal-user-avatar \{[^}]*width: 64px[^}]*height: 64px/);
  assert.match(styles, /\.athlete-portal-user-avatar \{[^}]*border: 2px solid rgb\(106 229 191 \/ \.6\)/);
});
