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

test("arena publishes portal notices and upcoming events inside Dados da arena > Portal do Atleta", () => {
  const settings = read("src/app/(app)/arena/page.tsx");
  const legacySettings = read("src/app/(app)/arena/portal-cliente/page.tsx");
  const editor = read("src/components/portal-editor-panels.tsx");
  const actions = read("src/lib/actions/client-portal.ts");
  const shell = read("src/components/layout/app-shell.tsx");

  assert.match(settings, /PortalEditorPanels/);
  assert.match(settings, /activeSection === "portal"/);
  assert.match(editor, /Avisos para o portal/);
  assert.match(editor, /Eventos em destaque/);
  assert.match(actions, /createPortalAnnouncementAction/);
  assert.match(actions, /togglePortalEventFeatureAction/);
  assert.match(legacySettings, /redirect\("\/arena\?section=portal"\)/);
  assert.doesNotMatch(shell, /\/arena\/portal-cliente/);
});

test("portal management keeps editorial forms in dialogs and publishes vertical event posts", () => {
  const editor = read("src/components/portal-editor-panels.tsx");
  const actions = read("src/lib/actions/client-portal.ts");
  const schema = read("prisma/schema.prisma");
  const home = read("src/lib/services/public-client-home.ts");
  const portal = read("src/components/tournaments/public-standings.tsx");

  assert.match(editor, /Novo aviso/);
  assert.match(editor, /Novo evento/);
  assert.match(editor, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(actions, /createPortalEventPostAction/);
  assert.match(schema, /model PortalEventPost \{/);
  assert.match(home, /portalEventPost\.findMany/);
  assert.match(portal, /PortalRichText/);
});

test("portal events preserve the image on mobile and can open an optional external link", () => {
  const editor = read("src/components/portal-editor-panels.tsx");
  const actions = read("src/lib/actions/client-portal.ts");
  const schema = read("prisma/schema.prisma");
  const home = read("src/lib/services/public-client-home.ts");
  const portal = read("src/components/tournaments/public-standings.tsx");
  const carousel = read("src/components/client-portal-event-carousel.tsx");
  const styles = read("src/app/globals.css");

  assert.match(schema, /linkUrl\s+String\?/);
  assert.match(editor, /name="linkUrl"/);
  assert.match(actions, /linkUrl/);
  assert.match(home, /linkUrl: true/);
  assert.match(portal, /ClientPortalEventCarousel/);
  assert.match(carousel, /event\.linkUrl/);
  assert.match(carousel, /target="_blank"/);
  assert.match(styles, /@media \(max-width: 620px\) \{[\s\S]*\.client-portal-event-posts img \{[^}]*object-fit: contain/);
});

test("client home filters financial entries in the database for the signed-in athlete", () => {
  const home = read("src/lib/services/public-client-home.ts");

  assert.match(home, /counterpartyName: player\.name/);
  assert.doesNotMatch(home, /entries\.filter\(\(entry\) => entry\.counterpartyName === player\?\.name\)/);
});

test("arena can edit and activate or deactivate an existing portal event without deleting it", () => {
  const editor = read("src/components/portal-editor-panels.tsx");
  const actions = read("src/lib/actions/client-portal.ts");

  assert.match(editor, /Editar evento/);
  assert.match(editor, /Exibir no Portal/);
  assert.match(editor, /type="checkbox"/);
  assert.match(actions, /updatePortalEventPostAction/);
  assert.match(actions, /togglePortalEventPostAction/);
  assert.match(actions, /where: \{ id, arenaId: auth\.arenaId \}/);
  assert.match(actions, /data: \{ active: !current\.active \}/);
});

test("client portal presents multiple featured events in an accessible carousel", () => {
  const portal = read("src/components/tournaments/public-standings.tsx");
  const carousel = read("src/components/client-portal-event-carousel.tsx");
  const styles = read("src/app/globals.css");

  assert.match(portal, /ClientPortalEventCarousel/);
  assert.match(carousel, /events\.length <= 1/);
  assert.match(carousel, /scrollBy/);
  assert.match(carousel, /Evento anterior/);
  assert.match(carousel, /Próximo evento/);
  assert.match(styles, /\.client-portal-event-carousel-track/);
  assert.match(styles, /scroll-snap-type: x mandatory/);
});

test("portal only calculates league standings when the athlete opens Ligas", () => {
  const page = read("src/app/classificacao/[arenaSlug]/page.tsx");
  const standings = read("src/lib/services/public-standings.ts");

  assert.match(page, /getPublicArenaShell/);
  assert.match(page, /section === "leagues" \? await getArenaPublicStandings/);
  assert.doesNotMatch(page, /Promise\.all\(\[getArenaPublicStandings/);
  assert.match(standings, /export async function getPublicArenaShell/);
  assert.match(page, /section !== "home" \? await getPublicLeaguePortal/);
  assert.match(page, /section === "home" \? await getPublicClientHome/);
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
