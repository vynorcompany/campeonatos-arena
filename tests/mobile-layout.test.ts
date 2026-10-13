import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("arena shell keeps navigation in a closable mobile drawer", () => {
  const frame = source("src/components/layout/mobile-app-frame.tsx");
  const shell = source("src/components/layout/app-shell.tsx");
  const styles = source("src/components/layout/app-shell.utilities.ts");
  assert.match(shell, /MobileAppFrame/);
  assert.match(shell, /id="arena-mobile-navigation"/);
  assert.match(frame, /aria-expanded=\{menuOpen\}/);
  assert.match(frame, /event\.key === "Escape"/);
  assert.match(frame, /setMenuOpen\(false\)/);
  assert.match(styles, /mobile-nav-open/);
  assert.match(styles, /viewport-760:-translate-x-full/);
});

test("agenda uses a compact date strip and a contained, keyboard-accessible court grid", () => {
  const page = source("src/app/(app)/agenda/page.tsx");
  const styles = source("src/app/(app)/agenda/page.utilities.ts");
  assert.match(page, /role="region" aria-label="Grade de horários por quadra" tabIndex=\{0\}/);
  assert.match(page, /const gridMinWidth = 64 \+ courts\.length \* 220/);
  assert.match(styles, /viewport-700:grid-cols-\[repeat\(3,_minmax\(0,_1fr\)\)\]/);
  assert.match(styles, /viewport-700:\[&_tbody_>_tr_>_th\]:sticky/);
});

test("WhatsApp mobile keeps the composer inside the viewport and scrolls only its panels", () => {
  const shell = source("src/components/layout/app-shell.utilities.ts");
  const page = source("src/app/(app)/whatsapp/page.utilities.ts");
  const workspace = source("src/components/whatsapp/whatsapp-chat-workspace.utilities.ts");
  assert.match(shell, /viewport-720:\[&:has\(\.whatsapp-page\)\]:h-\[100dvh\]/);
  assert.match(shell, /viewport-720:\[&:has\(\.whatsapp-page\)\]:overflow-hidden/);
  assert.match(page, /viewport-720:\[&_>_\.whatsapp-inbox\]:h-\[100%\]/);
  assert.match(workspace, /viewport-720:grid-rows-\[minmax\(0,_min\(220px,_35%\)\)_minmax\(0,_1fr\)\]/);
  assert.match(workspace, /viewport-420:grid-rows-\[minmax\(0,_min\(200px,_42%\)\)_minmax\(0,_1fr\)\]!/);
  assert.match(workspace, /viewport-720:min-h-\[0\]/);
  assert.match(workspace, /viewport-420:\[&_main_form_\.whatsapp-composer-field\]:\[grid-column:1\/-1\]/);
});

test("user management reflows rows and keeps actions visible on a narrow screen", () => {
  const page = source("src/components/users/arena-users-management.tsx");
  const styles = source("src/components/users/arena-users-management.utilities.ts");
  assert.match(page, /user_mobile_label}>Perfil/);
  assert.match(page, /user_mobile_label}>Ações/);
  assert.match(styles, /viewport-760:\[&_\.data-table\]:min-w-0!/);
  assert.match(styles, /viewport-760:\[&_\.data-table_tbody_tr\]:grid/);
  assert.match(styles, /viewport-760:\[&_\.data-table_tbody_td\]:block/);
});

test("o player de áudio ocupa o balão sem criar rolagem horizontal no chat estreito", () => {
  const bubble = source("src/components/whatsapp/whatsapp-message-bubble.utilities.ts");
  const workspace = source("src/components/whatsapp/whatsapp-chat-workspace.utilities.ts");
  assert.match(bubble, /"whatsapp-message-audio", "tw:block", "tw:w-full", "tw:max-w-full", "tw:min-w-0"/);
  assert.doesNotMatch(bubble, /tw:min-w-\[270px\]/);
  assert.match(workspace, /article:has\(\.whatsapp-message-audio\)\]:w-\[min\(310px,_100%\)\]/);
  assert.match(workspace, /article:has\(\.whatsapp-message-audio\)\]:max-w-full/);
});

test("a página não encontrada mantém cartão e ações compactos no celular", () => {
  const styles = source("src/app/not-found.utilities.ts");
  assert.match(styles, /tw:items-start/);
  assert.match(styles, /tw:\[&_\.section-card\]:max-w-\[560px\]/);
  assert.doesNotMatch(styles, /tw:\[min-height:100vh\].*tw:grid/);
});
