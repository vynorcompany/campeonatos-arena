import { PrismaClient } from "@prisma/client";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const databaseUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const sessionToken = process.env.ARENA_GOAL_TEST_SESSION_TOKEN ?? "";
const localVisual = process.env.ARENA_VISUAL_LOCAL === "true";
if ((process.env.GITHUB_ACTIONS !== "true" && !localVisual) ||
    process.env.DATABASE_URL !== databaseUrl ||
    !(databaseUrl.startsWith("postgresql://postgres@127.0.0.1:55433/arena_goal?") || (localVisual && databaseUrl.startsWith("postgresql://postgres@127.0.0.1:55433/arena_goal_visual?"))) ||
    !/^[a-f0-9]{40}$/i.test(sessionToken)) {
  throw new Error("O teste visual exige o banco fictício e isolado da CI.");
}

const baseUrl = "http://127.0.0.1:3011";
const outputDir = "artifacts/visual-smoke";
const browserPort = 31991;
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
function testAudioDataUrl() {
  const sampleRate = 8_000;
  const bytes = Buffer.alloc(44 + sampleRate * 2);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(sampleRate * 2, 40);
  for (let index = 0; index < sampleRate; index += 1) {
    bytes.writeInt16LE(Math.round(Math.sin(index * 2 * Math.PI * 440 / sampleRate) * 4000), 44 + index * 2);
  }
  return `data:audio/wav;base64,${bytes.toString("base64")}`;
}
const routes = [
  "/painel", "/assistente", "/whatsapp", "/usuarios", "/minha-conta",
  "/torneios", "/torneios/novo", "/torneios/inscricoes", "/torneios/rankings", "/torneios/rankings/novo",
  "/torneios?status=finished", "/grupos", "/duplas", "/agenda", "/agenda/configuracao", "/calendario", "/comandas",
  "/proximos-jogos/apresentacao", "/proximos-jogos/patrocinios",
  "/jogadores", "/professores", "/aulas", "/aulas/alunos", "/aulas/registrar",
  "/pdv/caixa", "/pdv", "/pdv/novo", "/pdv/servicos", "/pdv/vendas", "/pdv/estoque", "/pdv/balanco",
  "/financeiro", "/financeiro/folha", "/financeiro/contas-a-receber", "/financeiro/contas-a-pagar",
  "/financeiro/mensalidades", "/financeiro/planos", "/financeiro/pdv-estoque", "/financeiro/configuracoes",
  ...["categorias-financeiras", "categorias-produtos", "pagamentos-online", "contas-bancarias", "cupons", "fornecedores", "formas-pagamento", "notas-fiscais"]
    .map((area) => `/financeiro/configuracoes/${area}`),
  "/relatorios",
  ...["caixa", "lancamentos", "produtos", "estoque", "comandas", "dre", "planos", "reservas", "pagamentos-online"]
    .map((report) => `/relatorios/${report}`),
  "/configuracoes", "/configuracoes/checkin", "/configuracoes/impressora", "/configuracoes/dispositivos", "/configuracoes/politicas", "/configuracoes/privacidade",
  "/arena", "/arena/regulamento", "/suporte",
];
const agencyRoutes = [
  "/agencia", "/agencia/planos", "/agencia/arenas", "/agencia/arenas/usuarios", "/agencia/conexoes",
  "/agencia/financeiro", "/agencia/financeiro/mrr", "/agencia/financeiro/previsoes",
  "/agencia/suporte", "/agencia/suporte/historico",
];
const viewports = [
  { name: "desktop", width: 1366, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
const adminViewports = [...viewports, { name: "mobile-320", width: 320, height: 700 }];
const pageMetricsExpression = "({path:location.pathname,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,body:document.body?.innerText ?? '',mainBody:document.querySelector('main')?.innerText ?? '',ready:document.readyState})";

async function browserSocket(browser, startupDetails) {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    if (browser.exitCode !== null || browser.signalCode !== null || startupDetails().error) {
      throw new Error(`Edge encerrou antes de iniciar: ${JSON.stringify(startupDetails())}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${browserPort}/json/list`, { signal: AbortSignal.timeout(2_000) });
      const target = (await response.json()).find((item) => item.type === "page");
      if (target?.webSocketDebuggerUrl) return target.webSocketDebuggerUrl;
    } catch {}
    await pause(200);
  }
  throw new Error(`Edge não iniciou na CI em 60 segundos: ${JSON.stringify(startupDetails())}`);
}

async function connectCdp(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
    else waiter.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`${method} demorou demais.`)); }, 20_000);
    pending.set(id, {
      resolve: (value) => { clearTimeout(timeout); resolve(value); },
      reject: (error) => { clearTimeout(timeout); reject(error); },
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
  return { socket, send };
}

async function main() {
  const db = new PrismaClient();
  let browser;
  let socket;
  try {
    const arenaA = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    await mkdir(outputDir, { recursive: true });
    browser = spawn("microsoft-edge", [
      "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--no-first-run", "--disable-extensions",
      `--remote-debugging-port=${browserPort}`, "--user-data-dir=/tmp/arena-goal-edge", "about:blank",
    ], { stdio: ["ignore", "ignore", "pipe"] });
    let browserError = "";
    let browserStderr = "";
    browser.on("error", (error) => { browserError = error.message; });
    browser.stderr?.on("data", (chunk) => { browserStderr = `${browserStderr}${chunk}`.slice(-2000); });
    const connection = await connectCdp(await browserSocket(browser, () => ({ error: browserError, stderr: browserStderr, exitCode: browser.exitCode, signalCode: browser.signalCode })));
    socket = connection.socket;
    const { send } = connection;
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    await send("Emulation.setLocaleOverride", { locale: "pt-BR" });
    const cookie = (arenaId, token = sessionToken) => `padel_session=${token}; padel_arena=${arenaId}`;
    const selectArena = async (arenaId, token = sessionToken) => {
      const session = await send("Network.setCookie", { name: "padel_session", value: token, url: baseUrl, httpOnly: true, sameSite: "Lax" });
      const arena = await send("Network.setCookie", { name: "padel_arena", value: arenaId, url: baseUrl, httpOnly: true, sameSite: "Lax" });
      if (!session.success || !arena.success) throw new Error("Não foi possível configurar a sessão de teste.");
    };
    const waitForPageFade = async () => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const opacity = await send("Runtime.evaluate", { expression: "Number(getComputedStyle(document.body).opacity)", returnByValue: true });
        if (opacity.result.value >= 0.99) return;
        await pause(100);
      }
      throw new Error("A animação de entrada da página não terminou antes da captura.");
    };
    const visit = async (path, viewport, arenaId, label, token = sessionToken) => {
      const pathname = path.split("?", 1)[0];
      const response = await fetch(`${baseUrl}${path}`, { headers: { Cookie: cookie(arenaId, token) }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
      await response.body?.cancel();
      if (response.status !== 200) throw new Error(`${label}: HTTP ${response.status} (${response.headers.get("location") ?? "sem destino"})`);
      await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.name !== "desktop" });
      await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
      await selectArena(arenaId, token);
      await send("Page.navigate", { url: `${baseUrl}${path}` });
      let metrics;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const result = await send("Runtime.evaluate", {
          expression: pageMetricsExpression,
          returnByValue: true,
        });
        metrics = result.result.value;
        if (metrics?.ready === "complete" && metrics.mainBody.trim().length >= 15 && metrics.path === pathname) break;
        await pause(200);
      }
      await pause(1200);
      const settled = await send("Runtime.evaluate", {
        expression: pageMetricsExpression,
        returnByValue: true,
      });
      metrics = settled.result.value;
      const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
      await writeFile(`${outputDir}/${label}.png`, Buffer.from(shot.data, "base64"));
      if (metrics.path !== pathname || metrics.mainBody.trim().length < 15 || metrics.scrollWidth > metrics.width + 1 || /Algo saiu do fluxo|Application error|Internal Server Error/i.test(metrics.body)) {
        throw new Error(`${label}: layout ou navegação inválida: ${JSON.stringify({ path: metrics.path, width: metrics.width, scrollWidth: metrics.scrollWidth, mainBodyLength: metrics.mainBody.trim().length })}`);
      }
      console.log(`${label}: HTTP 200, ${metrics.width}px, sem overflow horizontal`);
      return metrics.body;
    };
    const legacyGames = await fetch(`${baseUrl}/jogos?tournamentId=legacy-event&status=finished`, { headers: { Cookie: cookie(arenaA.id, sessionToken) }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
    await legacyGames.body?.cancel();
    const gamesDestination = new URL(legacyGames.headers.get("location") ?? "/", baseUrl);
    if (![307, 308].includes(legacyGames.status) || gamesDestination.pathname !== "/torneios" || gamesDestination.searchParams.get("tournamentId") !== "legacy-event" || gamesDestination.searchParams.get("status") !== "finished") throw new Error("O acesso legado aos jogos não preservou o evento e o histórico na tela unificada.");
    for (const viewport of adminViewports) {
      for (const route of routes) {
        const label = `${viewport.name}-${route.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/^-/, "")}`;
        const body = await visit(route, viewport, arenaA.id, label);
        if (route === "/relatorios" && viewport.name === "mobile-320") {
          await send("Runtime.evaluate", { expression: "document.querySelector('button[aria-label=\"Abrir menu\"]')?.click()" });
          await pause(200);
          await send("Runtime.evaluate", { expression: "document.querySelector('button[aria-label=\"Abrir submenu Relatórios\"]')?.click()" });
          await pause(200);
          const reportNavigation = await send("Runtime.evaluate", {
            expression: "(() => { const link = document.querySelector('#arena-mobile-navigation a[href=\"/relatorios/pagamentos-online\"]'); link?.scrollIntoView({ block: 'center' }); const rect = link?.getBoundingClientRect(); const sidebar = document.querySelector('#arena-mobile-navigation')?.getBoundingClientRect(); return rect && sidebar ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, sidebarLeft: sidebar.left, sidebarRight: sidebar.right, width: innerWidth, height: innerHeight, visible: rect.width > 0 && rect.height > 0 } : null; })()",
            returnByValue: true,
          });
          const item = reportNavigation.result.value;
          if (!item?.visible || item.left < item.sidebarLeft - 1 || item.right > item.sidebarRight + 1 || item.left < -1 || item.right > item.width + 1 || item.top < -1 || item.bottom > item.height + 1) {
            throw new Error(`${label}: Pagamentos Online cortado no menu móvel: ${JSON.stringify(item)}`);
          }
          const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
          await writeFile(`${outputDir}/${label}-menu.png`, Buffer.from(shot.data, "base64"));
        }
        if (route === "/financeiro") {
          const navigation = await send("Runtime.evaluate", {
            expression: "(() => { const nav = document.querySelector('nav[aria-label=\"Áreas financeiras\"]'); return nav ? [...nav.querySelectorAll('a')].map((link) => ({ path: new URL(link.href).pathname, clipped: link.scrollWidth > link.clientWidth + 1 })) : null; })()",
            returnByValue: true,
          });
          const expected = ["/financeiro/folha", "/financeiro/contas-a-receber", "/financeiro/contas-a-pagar", "/pdv"];
          if (!navigation.result.value || JSON.stringify(navigation.result.value.map((link) => link.path)) !== JSON.stringify(expected) || navigation.result.value.some((link) => link.clipped)) {
            throw new Error(`${label}: destinos do Financeiro faltando ou cortados: ${JSON.stringify(navigation.result.value)}`);
          }
        }
        if (route === "/configuracoes") {
          const settings = await send("Runtime.evaluate", {
            expression: "(() => { const nav = document.querySelector('nav[aria-label=\"Configurações\"]'); return nav ? [...nav.querySelectorAll('a')].map(link => ({ href: new URL(link.href).pathname + new URL(link.href).search, clipped: link.scrollWidth > link.clientWidth + 1 })) : null; })()",
            returnByValue: true,
          });
          const expected = ["/configuracoes/dispositivos", "/configuracoes/impressora", "/configuracoes/politicas", "/configuracoes/privacidade", "/arena", "/arena?section=portal", "/financeiro/configuracoes", "/configuracoes/checkin", "/agenda/configuracao"];
          if (!settings.result.value || JSON.stringify(settings.result.value.map(link => link.href)) !== JSON.stringify(expected) || settings.result.value.some(link => link.clipped)) {
            throw new Error(`${label}: destinos das Configurações faltando ou cortados: ${JSON.stringify(settings.result.value)}`);
          }
        }
        if (["/aulas", "/aulas/alunos", "/financeiro/planos"].includes(route)) {
          const form = await send("Runtime.evaluate", {
            expression: "(() => ({ notes: document.querySelector('#plan-notes, #student-notes')?.tagName, emptyPlayerOption: document.querySelector('#student-player option[value=\"\"]')?.textContent?.trim() ?? null }))()",
            returnByValue: true,
          });
          if (form.result.value.notes !== "TEXTAREA" || (route !== "/financeiro/planos" && form.result.value.emptyPlayerOption !== "Sem vínculo com jogador")) {
            throw new Error(`${label}: campo de observações ou seletor de aluno não se adapta à largura disponível.`);
          }
        }
        if (route === "/usuarios" && (!body.includes("Acesso legado · Proprietário") || body.includes("Migrado · OWNER"))) {
          throw new Error(`${label}: identificador interno do perfil legado exposto na lista de usuários.`);
        }
        if (route === "/usuarios") {
          const clicked = await send("Runtime.evaluate", {
            expression: "(() => { const button = document.querySelector('button[aria-label^=\"Editar \"]'); button?.click(); return Boolean(button); })()",
            returnByValue: true,
          });
          if (!clicked.result.value) throw new Error(`${label}: botão de edição do usuário ausente.`);
          await pause(400);
          const editor = await send("Runtime.evaluate", {
            expression: "(() => { const select = document.querySelector('.entity-edit-form select[name=\"permissionProfileId\"]'); const grid = select?.closest('.entity-edit-grid-user'); const style = select && getComputedStyle(select); const canvas = document.createElement('canvas'); const context = canvas.getContext('2d'); if (style && context) context.font = style.font; const selectedWidth = context && select ? context.measureText(select.selectedOptions[0]?.text ?? '').width : 0; const availableWidth = select && style ? select.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 22 : 0; return { visible: Boolean(select), overflow: document.documentElement.scrollWidth > innerWidth + 1, widthRatio: select && grid ? select.getBoundingClientRect().width / grid.getBoundingClientRect().width : 0, labelFits: selectedWidth <= availableWidth, options: [...(select?.options ?? [])].map(option => option.text) }; })()",
            returnByValue: true,
          });
          if (!editor.result.value.visible || editor.result.value.overflow || editor.result.value.widthRatio < 0.85 || !editor.result.value.labelFits ||
              !editor.result.value.options.includes("Proprietário") ||
              editor.result.value.options.some((option) => option.includes("Migrado · OWNER"))) {
            throw new Error(`${label}: edição do usuário inválida: ${JSON.stringify(editor.result.value)}`);
          }
          const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: true });
          await writeFile(`${outputDir}/${label}-edit.png`, Buffer.from(shot.data, "base64"));
        }
        if (route === "/jogadores") {
          if (viewport.name !== "desktop") {
            await send("Runtime.evaluate", { expression: "[...document.querySelectorAll('button')].find((item) => item.textContent?.trim() === 'Filtros e ferramentas')?.click()" });
            await pause(200);
          }
          const opened = await send("Runtime.evaluate", {
            expression: "(() => { const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.trim() === 'Mesclar contatos' && item.getBoundingClientRect().width > 0); button?.click(); return Boolean(button); })()",
            returnByValue: true,
          });
          if (!opened.result.value) throw new Error(`${label}: botão de mesclagem ausente.`);
          await pause(350);
          const modalResult = await send("Runtime.evaluate", {
            expression: "(() => { const dialog = document.querySelector('[role=dialog][aria-label=\"Mesclar contatos\"]'); if (!dialog) return null; const rect = dialog.getBoundingClientRect(); return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: innerWidth, height: innerHeight, overflow: dialog.scrollWidth > dialog.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1, notice: dialog.textContent?.includes('Históricos e vínculos incompatíveis'), actions: Boolean([...dialog.querySelectorAll('button')].find((item) => item.textContent?.includes('Confirmar mesclagem'))) }; })()",
            returnByValue: true,
          });
          const modal = modalResult.result.value;
          if (!modal || modal.left < -1 || modal.right > modal.width + 1 || modal.top < -1 || modal.bottom > modal.height + 1 || modal.overflow || !modal.notice || !modal.actions) {
            throw new Error(`${label}: modal de mesclagem cortado ou incompleto: ${JSON.stringify(modal)}`);
          }
          const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
          await writeFile(`${outputDir}/${label}-mesclar.png`, Buffer.from(shot.data, "base64"));
        }
      }
      for (const route of agencyRoutes) {
        const label = `${viewport.name}-${route.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/^-/, "")}`;
        await visit(route, viewport, arenaA.id, label);
      }
    }
    const previousLoyalty = await db.arena.findUniqueOrThrow({
      where: { id: arenaA.id },
      select: { loyaltyEnabled: true, loyaltyStartedAt: true, loyaltyVisitsRequired: true, loyaltyRewardLabel: true },
    });
    try {
      await db.arena.update({ where: { id: arenaA.id }, data: {
        loyaltyEnabled: true, loyaltyStartedAt: new Date(), loyaltyVisitsRequired: 4, loyaltyRewardLabel: "Uma reserva cortesia GOAL",
      } });
      for (const viewport of [viewports[0], adminViewports[2]]) {
        const label = `${viewport.name}-fidelidade`;
        await visit("/jogadores", viewport, arenaA.id, label);
        const settingsButton = await send("Runtime.evaluate", { expression: "(() => { const button=[...document.querySelectorAll('button')].find(item=>item.textContent?.trim()==='Configurar fidelidade'); button?.click(); return Boolean(button); })()", returnByValue: true });
        if (!settingsButton.result.value) throw new Error(`${label}: configuração de fidelidade indisponível.`);
        await pause(200);
        const settings = await send("Runtime.evaluate", { expression: "(() => { const dialog=document.querySelector('[role=dialog][aria-label=\"Configurar fidelidade\"]'); if (!dialog) return null; const rect=dialog.getBoundingClientRect(), fields=[...dialog.querySelectorAll('input[name=visitsRequired],input[name=rewardLabel]')].map(item=>item.getBoundingClientRect()); return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:innerWidth,height:innerHeight,overflow:dialog.scrollWidth>dialog.clientWidth+1||document.documentElement.scrollWidth>innerWidth+1,fields:fields.map(item=>({top:item.top,bottom:item.bottom}))}; })()", returnByValue: true });
        const config = settings.result.value;
        if (!config || config.left < -1 || config.right > config.width + 1 || config.top < -1 || config.bottom > config.height + 1 || config.overflow || config.fields.length !== 2 ||
            (viewport.name !== "desktop" && config.fields[1].top < config.fields[0].bottom - 1)) {
          throw new Error(`${label}: configuração de fidelidade cortada ou sem reflow: ${JSON.stringify(config)}`);
        }
        const settingsShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
        await writeFile(`${outputDir}/${label}-configuracao.png`, Buffer.from(settingsShot.data, "base64"));
        await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
        await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
        await pause(200);
        const clientButton = await send("Runtime.evaluate", { expression: "(() => { if (document.querySelector('[role=dialog]')) return false; const button=[...document.querySelectorAll('button')].find(item=>item.textContent?.trim()==='Fidelidade'); button?.click(); return Boolean(button); })()", returnByValue: true });
        if (!clientButton.result.value) throw new Error(`${label}: fidelidade do cliente indisponível ou modal anterior não fechou com Esc.`);
        let clientDialog;
        for (let attempt = 0; attempt < 25; attempt += 1) {
          clientDialog = await send("Runtime.evaluate", { expression: "(() => { const dialog=document.querySelector('[role=dialog][aria-label^=\"Fidelidade de \" ]'); if (!dialog || !dialog.textContent?.includes('Reservas concluídas')) return null; const rect=dialog.getBoundingClientRect(); return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:innerWidth,height:innerHeight,overflow:dialog.scrollWidth>dialog.clientWidth+1||document.documentElement.scrollWidth>innerWidth+1,visit:dialog.textContent.includes('Registrar visita avulsa'),reward:dialog.textContent.includes('Resgatar recompensa')}; })()", returnByValue: true });
          if (clientDialog.result.value) break;
          await pause(200);
        }
        const client = clientDialog?.result.value;
        if (!client || client.left < -1 || client.right > client.width + 1 || client.top < -1 || client.bottom > client.height + 1 || client.overflow || !client.visit || !client.reward) {
          throw new Error(`${label}: fidelidade do cliente cortada ou incompleta: ${JSON.stringify(client)}`);
        }
        const clientShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
        await writeFile(`${outputDir}/${label}-cliente.png`, Buffer.from(clientShot.data, "base64"));
      }
    } finally {
      await db.arena.update({ where: { id: arenaA.id }, data: previousLoyalty });
    }
    for (const viewport of [viewports[0], adminViewports[2]]) {
      await visit("/agencia/arenas", viewport, arenaA.id, `${viewport.name}-agencia-exclusao-antes`);
      const opened = await send("Runtime.evaluate", {
        expression: "(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent?.trim() === 'Excluir arena'); button?.click(); return Boolean(button); })()",
        returnByValue: true,
      });
      if (!opened.result.value) throw new Error(`${viewport.name}: exclusão da arena sem botão de confirmação.`);
      await pause(300);
      const confirmation = await send("Runtime.evaluate", {
        expression: "(() => { const dialog = document.querySelector('[role=dialog]'); const rect = dialog?.getBoundingClientRect(); return { title: dialog?.textContent?.includes('Confirmar exclusão'), keyword: Boolean(dialog?.querySelector('input[name=confirmKeyword]')), left: rect?.left, right: rect?.right, top: rect?.top, bottom: rect?.bottom, width: innerWidth, height: innerHeight, overflow: Boolean(dialog && dialog.scrollWidth > dialog.clientWidth + 1) || document.documentElement.scrollWidth > innerWidth + 1 }; })()",
        returnByValue: true,
      });
      const modal = confirmation.result.value;
      if (!modal.title || !modal.keyword || modal.left < -1 || modal.right > modal.width + 1 || modal.top < -1 || modal.bottom > modal.height + 1 || modal.overflow) {
        throw new Error(`${viewport.name}: modal padrão de exclusão cortado ou incompleto: ${JSON.stringify(modal)}`);
      }
      const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
      await writeFile(`${outputDir}/${viewport.name}-agencia-exclusao-modal.png`, Buffer.from(shot.data, "base64"));
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await pause(200);
      const closed = await send("Runtime.evaluate", { expression: "!document.querySelector('[role=dialog]')", returnByValue: true });
      if (!closed.result.value || !await db.arena.findUnique({ where: { id: arenaA.id } })) throw new Error(`${viewport.name}: Esc não fechou a confirmação sem excluir a arena.`);
      if (viewport.name === "mobile-320") {
        await send("Runtime.evaluate", { expression: "[...document.querySelectorAll('button')].find(item => item.textContent?.trim() === 'Excluir arena')?.click()" });
        await pause(200);
        await send("Input.dispatchMouseEvent", { type: "mousePressed", x: 2, y: 2, button: "left", clickCount: 1 });
        await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 2, y: 2, button: "left", clickCount: 1 });
        await pause(200);
        const outsideClosed = await send("Runtime.evaluate", { expression: "!document.querySelector('[role=dialog]')", returnByValue: true });
        if (!outsideClosed.result.value) throw new Error("Clicar fora não fechou o modal de exclusão.");
      }
    }
    console.log("Exclusão da arena exige modal padrão legível em desktop e 320 px, e Esc cancela sem apagar.");
    const previousTvSettings = await db.tvPresentationSettings.findUnique({ where: { arenaId: arenaA.id } });
    const tvFixture = await db.manualUpcomingMatch.createManyAndReturn({
      data: [1, 2, 3].map((index) => ({ arenaId: arenaA.id, displayOrder: index, homePairName: `Mandante TV GOAL ${index}`, awayPairName: `Visitante TV GOAL ${index}`, courtName: "Quadra GOAL", scheduledTime: `19:0${index}`, status: "SCHEDULED" })),
      select: { id: true, displayOrder: true },
    });
    await db.tvPresentationSettings.upsert({
      where: { arenaId: arenaA.id },
      create: { arenaId: arenaA.id, tvMatchSource: "MANUAL", showMatches: true, showCalendar: false, showSponsors: false, showRanking: false, showMonthlyPrize: false, showNightWinner: false },
      update: { tvMatchSource: "MANUAL", showMatches: true, showCalendar: false, showSponsors: false, showRanking: false, showMonthlyPrize: false, showNightWinner: false },
    });
    for (const viewport of viewports) {
      const body = await visit("/proximos-jogos/tv", viewport, arenaA.id, `${viewport.name}-tv-tres-jogos`);
      const cards = await send("Runtime.evaluate", { expression: "document.querySelectorAll('.tv-match-card').length", returnByValue: true });
      if (cards.result.value !== 3 || !body.includes("Mandante TV GOAL 1") || !body.includes("Mandante TV GOAL 3")) throw new Error(`${viewport.name}: TV não exibiu exatamente os três jogos cadastrados.`);
      if (viewport.name === "desktop") {
        const lastCard = await send("Runtime.evaluate", { expression: "(() => { const grid = document.querySelector('.tv-matches-grid')?.getBoundingClientRect(); const card = document.querySelector('.tv-match-card:last-child')?.getBoundingClientRect(); return grid && card ? { left: card.left - grid.left, right: grid.right - card.right } : null; })()", returnByValue: true });
        if (!lastCard.result.value || Math.abs(lastCard.result.value.left - lastCard.result.value.right) > 12) throw new Error(`TV não centralizou o terceiro jogo: ${JSON.stringify(lastCard.result.value)}`);
      }
    }
    await db.manualUpcomingMatch.deleteMany({ where: { id: { in: tvFixture.filter((match) => match.displayOrder > 1).map((match) => match.id) }, arenaId: arenaA.id } });
    const singleGame = await visit("/proximos-jogos/tv", viewports[0], arenaA.id, "desktop-tv-um-jogo");
    const singleCard = await send("Runtime.evaluate", { expression: "document.querySelectorAll('.tv-match-card').length", returnByValue: true });
    if (singleCard.result.value !== 1 || !singleGame.includes("Mandante TV GOAL 1") || singleGame.includes("Mandante TV GOAL 2")) throw new Error("TV não se adaptou à redução para um jogo cadastrado.");
    const singleLayout = await send("Runtime.evaluate", { expression: "(() => { const grid = document.querySelector('.tv-matches-grid')?.getBoundingClientRect(); const card = document.querySelector('.tv-match-card')?.getBoundingClientRect(); return grid && card ? { left: grid.left, right: document.documentElement.clientWidth - grid.right, cardRatio: card.width / grid.width, width: grid.width } : null; })()", returnByValue: true });
    if (!singleLayout.result.value || Math.abs(singleLayout.result.value.left - singleLayout.result.value.right) > 12 || singleLayout.result.value.cardRatio < 0.95 || singleLayout.result.value.width < 650) throw new Error(`TV não centralizou nem ampliou o único jogo: ${JSON.stringify(singleLayout.result.value)}`);
    const otherArenaTv = await visit("/proximos-jogos/tv", viewports[0], arenaB.id, "desktop-tv-outra-arena");
    if (otherArenaTv.includes("Mandante TV GOAL")) throw new Error("TV exibiu jogo de outra arena.");
    await db.manualUpcomingMatch.deleteMany({ where: { id: { in: tvFixture.map((match) => match.id) }, arenaId: arenaA.id } });
    if (previousTvSettings) {
      await db.tvPresentationSettings.update({
        where: { arenaId: arenaA.id },
        data: {
          tvMatchSource: previousTvSettings.tvMatchSource, showMatches: previousTvSettings.showMatches,
          showCalendar: previousTvSettings.showCalendar, showSponsors: previousTvSettings.showSponsors,
          showRanking: previousTvSettings.showRanking, showMonthlyPrize: previousTvSettings.showMonthlyPrize,
          showNightWinner: previousTvSettings.showNightWinner,
        },
      });
    } else {
      await db.tvPresentationSettings.delete({ where: { arenaId: arenaA.id } });
    }
    console.log("TV exibe somente 3 ou 1 jogos cadastrados, adapta a grade e isola arenas em desktop e celular.");
    const cashOpening = await visit("/pdv/caixa", viewports[0], arenaA.id, "desktop-caixa-antes-da-abertura");
    if (!cashOpening.includes("Abertura de caixa")) throw new Error("O caixa fictício não iniciou fechado.");
    await send("Runtime.evaluate", { expression: "document.querySelector('input[name=openingAmount]')?.focus()" });
    await send("Input.insertText", { text: "120,50" });
    await send("Runtime.evaluate", { expression: "[...document.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Abrir caixa')?.click()" });
    let cashRegister;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      cashRegister = await db.cashRegister.findFirst({ where: { arenaId: arenaA.id, status: "OPEN", openingAmountCents: 12050 }, orderBy: { openedAt: "desc" } });
      if (cashRegister) break;
      await pause(250);
    }
    if (!cashRegister) throw new Error("A abertura de caixa pela interface não persistiu o fundo inicial.");
    for (const viewport of adminViewports) {
      const body = await visit("/pdv/caixa", viewport, arenaA.id, `${viewport.name}-caixa-aberto`);
      if (!body.includes("Saldo esperado") || !/R\$\s*120,50/.test(body) || !body.includes("Registrar movimentação") || !body.includes("Fechamento de caixa")) {
        throw new Error(`${viewport.name}: operação de caixa aberta incompleta.`);
      }
      const fields = await send("Runtime.evaluate", {
        expression: "(() => { const forms = [...document.querySelectorAll('form')]; const movement = forms.find(form => form.querySelector('select[name=type]')); const closing = forms.find(form => form.querySelector('input[name=countedAmount]')); const controls = [movement?.querySelector('input[name=amount]'), closing?.querySelector('input[name=countedAmount]'), movement?.querySelector('button[type=submit]'), closing?.querySelector('button[type=submit]')]; return { width: innerWidth, controls: controls.map(control => { const rect = control?.getBoundingClientRect(); return { left: rect?.left, right: rect?.right, width: rect?.width }; }) }; })()",
        returnByValue: true,
      });
      if (fields.result.value.controls.some((control) => !control.width || control.left < -1 || control.right > fields.result.value.width + 1)) {
        throw new Error(`${viewport.name}: campos ou ações do caixa cortados: ${JSON.stringify(fields.result.value)}`);
      }
    }
    await send("Runtime.evaluate", { expression: "document.querySelector('input[name=amount]')?.focus()" });
    await send("Input.insertText", { text: "5,00" });
    await send("Runtime.evaluate", { expression: "[...document.querySelectorAll('form')].find(form => form.querySelector('select[name=type]'))?.querySelector('button[type=submit]')?.click()" });
    let cashMovement;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      cashMovement = await db.cashMovement.findFirst({ where: { arenaId: arenaA.id, registerId: cashRegister.id, type: "SUPPLY", amountCents: 500 } });
      if (cashMovement) break;
      await pause(250);
    }
    if (!cashMovement) throw new Error("A movimentação de R$ 5,00 não foi registrada pela interface.");
    const cashAfterMovement = await visit("/pdv/caixa", adminViewports[2], arenaA.id, "mobile-320-caixa-movimentado");
    if (!/R\$\s*125,50/.test(cashAfterMovement) || !/R\$\s*5,00/.test(cashAfterMovement)) throw new Error("O saldo do caixa não refletiu a movimentação.");
    await send("Runtime.evaluate", { expression: "document.querySelector('input[name=countedAmount]')?.focus()" });
    await send("Input.insertText", { text: "125,50" });
    await send("Runtime.evaluate", { expression: "[...document.querySelectorAll('form')].find(form => form.querySelector('input[name=countedAmount]'))?.querySelector('button[type=submit]')?.click()" });
    let closedCash;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      closedCash = await db.cashRegister.findUniqueOrThrow({ where: { id: cashRegister.id }, select: { status: true, countedAmountCents: true, differenceCents: true } });
      if (closedCash.status === "CLOSED") break;
      await pause(250);
    }
    if (closedCash?.status !== "CLOSED" || closedCash.countedAmountCents !== 12550 || closedCash.differenceCents !== 0) {
      throw new Error(`O fechamento de caixa não conciliou o valor contado: ${JSON.stringify(closedCash)}`);
    }
    const cashClosed = await visit("/pdv/caixa", viewports[1], arenaA.id, "mobile-caixa-encerrado");
    if (!cashClosed.includes("Encerrado") || !cashClosed.includes("Diferença") || !/R\$\s*0,00/.test(cashClosed)) throw new Error("O resumo do caixa fechado está incompleto.");
    const cashReport = await visit("/relatorios/caixa", viewports[0], arenaA.id, "desktop-relatorio-caixa-apos-fechamento");
    if (!/R\$\s*125,50/.test(cashReport)) throw new Error("O relatório de caixa não refletiu o fechamento fictício.");
    console.log("Caixa fictício aberto, movimentado e fechado pela interface, com conciliação no relatório.");
    const detailProduct = await db.product.findFirstOrThrow({ where: { arenaId: arenaA.id, name: "Produto GOAL" }, select: { id: true } });
    for (const viewport of adminViewports) {
      const comanda = await visit("/comandas/goal-fixture-comanda", viewport, arenaA.id, `${viewport.name}-comanda-detalhe`);
      if (!comanda.includes("Comanda GOAL") || !comanda.includes("Produto GOAL")) throw new Error(`${viewport.name}: detalhe da comanda fictícia incompleto.`);
      const product = await visit(`/pdv/${detailProduct.id}`, viewport, arenaA.id, `${viewport.name}-produto-detalhe`);
      if (!product.includes("Produto GOAL") || !product.includes("Ajuste de estoque")) throw new Error(`${viewport.name}: detalhe do produto fictício incompleto.`);
      const productBreadcrumb = await send("Runtime.evaluate", { expression: "document.querySelector('.workspace-page-breadcrumb strong')?.textContent?.trim() ?? ''", returnByValue: true });
      if (productBreadcrumb.result.value !== "Produto") throw new Error(`${viewport.name}: breadcrumb do produto exibe ID técnico ou rota incorreta: ${productBreadcrumb.result.value}`);
    }
    for (const [path, ownName] of [["/comandas/goal-fixture-comanda", "Comanda GOAL"], [`/pdv/${detailProduct.id}`, "Produto GOAL"]]) {
      const response = await fetch(`${baseUrl}${path}`, { headers: { Cookie: cookie(arenaB.id) }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
      const body = await response.text();
      if (response.status === 200 || body.includes(ownName)) throw new Error(`A arena B conseguiu abrir o detalhe privado ${path} da arena A.`);
    }
    console.log("Detalhes de comanda e produto verificados em três larguras e isolados entre arenas.");
    const futureAgendaDate = new Date(Date.now() + 3 * 24 * 60 * 60_000).toISOString().slice(0, 10);
    for (const viewport of [...viewports, { name: "mobile-320", width: 320, height: 700 }]) {
      const agendaPath = `/agenda?data=${futureAgendaDate}`;
      const response = await fetch(`${baseUrl}${agendaPath}`, { headers: { Cookie: cookie(arenaA.id) }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
      await response.body?.cancel();
      if (response.status !== 200) throw new Error(`${viewport.name}: agenda futura indisponível (HTTP ${response.status}).`);
      await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.name !== "desktop" });
      await selectArena(arenaA.id);
      await send("Page.navigate", { url: `${baseUrl}${agendaPath}` });
      let slotReady = false;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const result = await send("Runtime.evaluate", {
          expression: "location.pathname === '/agenda' && [...document.querySelectorAll('td')].some((cell) => cell.textContent?.trim() === 'Livre' && cell.querySelector('button'))",
          returnByValue: true,
        });
        slotReady = result.result.value;
        if (slotReady) break;
        await pause(250);
      }
      if (!slotReady) throw new Error(`${viewport.name}: horário livre não apareceu na grade futura.`);
      await pause(500);
      const opened = await send("Runtime.evaluate", {
        expression: "(() => { const cell = [...document.querySelectorAll('td')].find((item) => item.textContent?.trim() === 'Livre' && item.querySelector('button')); cell?.querySelector('button')?.click(); return Boolean(cell); })()",
        returnByValue: true,
      });
      if (!opened.result.value) throw new Error(`${viewport.name}: não foi possível abrir o agendamento.`);
      await pause(700);
      const dialogResult = await send("Runtime.evaluate", {
        expression: "(() => { const dialog = document.querySelector('[role=dialog][aria-label=\"Agendamento de horário\"]'); if (!dialog) return null; const rect = dialog.getBoundingClientRect(); const footer = dialog.querySelector('footer'); return { width: innerWidth, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1, left: rect.left, right: rect.right, dialogOverflow: dialog.scrollWidth > dialog.clientWidth + 1, hasFields: Boolean(dialog.querySelector('input[type=date]') && dialog.querySelector('input[placeholder=\"Digite o nome do cliente\"]')), hasSave: Boolean([...(footer?.querySelectorAll('button') ?? [])].find((button) => button.textContent?.includes('Salvar agendamento'))) }; })()",
        returnByValue: true,
      });
      const dialog = dialogResult.result.value;
      if (!dialog || dialog.pageOverflow || dialog.dialogOverflow || dialog.left < -1 || dialog.right > dialog.width + 1 || !dialog.hasFields || !dialog.hasSave) {
        throw new Error(`${viewport.name}: modal de agendamento cortado ou incompleto: ${JSON.stringify(dialog)}`);
      }
      const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
      await writeFile(`${outputDir}/${viewport.name}-agenda-agendamento-modal.png`, Buffer.from(shot.data, "base64"));
      await send("Runtime.evaluate", { expression: "document.querySelector('[role=dialog][aria-label=\"Agendamento de horário\"]').scrollTop = 100000" });
      await pause(200);
      const footerShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
      await writeFile(`${outputDir}/${viewport.name}-agenda-agendamento-acoes.png`, Buffer.from(footerShot.data, "base64"));
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await pause(200);
      const closed = await send("Runtime.evaluate", { expression: "!document.querySelector('[role=dialog][aria-label=\"Agendamento de horário\"]')", returnByValue: true });
      if (!closed.result.value) throw new Error(`${viewport.name}: Esc não fechou o agendamento.`);
      console.log(`${viewport.name}: modal de agendamento futuro abre, mantém campos/ações legíveis e fecha com Esc.`);
    }
    for (const [index, choice] of ["keep", "void"].entries()) {
      const viewport = viewports[index];
      const occurrenceId = `goal-cancel-${choice}`;
      const occurrence = await db.scheduleOccurrence.findUniqueOrThrow({ where: { id: occurrenceId }, select: { startsAt: true } });
      const date = occurrence.startsAt.toISOString().slice(0, 10);
      await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.name === "mobile" });
      await selectArena(arenaA.id);
      await send("Page.navigate", { url: `${baseUrl}/agenda?data=${date}` });
      let bookingVisible = false;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const result = await send("Runtime.evaluate", {
          expression: `Boolean([...document.querySelectorAll('button')].find((button) => button.textContent?.includes(${JSON.stringify(`Reserva cancelamento GOAL ${choice === "keep" ? "manter" : "cancelar"}`)})))`,
          returnByValue: true,
        });
        bookingVisible = result.result.value;
        if (bookingVisible) break;
        await pause(250);
      }
      if (!bookingVisible) throw new Error(`${viewport.name}: reserva fictícia não apareceu na agenda para cancelar.`);
      await pause(500);
      await send("Runtime.evaluate", {
        expression: `(() => { const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes(${JSON.stringify(`Reserva cancelamento GOAL ${choice === "keep" ? "manter" : "cancelar"}`)})); button?.click(); })()`,
      });
      await pause(350);
      const cancelTrigger = await send("Runtime.evaluate", {
        expression: "(() => { const dialog = document.querySelector('[role=dialog][aria-label=\"Agendamento de horário\"]'); const button = [...(dialog?.querySelectorAll('button') ?? [])].find((item) => item.textContent?.trim() === 'Cancelar reserva'); button?.click(); return Boolean(button); })()",
        returnByValue: true,
      });
      if (!cancelTrigger.result.value) throw new Error(`${viewport.name}: ação de cancelar reserva ausente.`);
      await pause(250);
      const confirm = await send("Runtime.evaluate", {
        expression: "(() => { const dialog = document.querySelector('[role=dialog][aria-label=\"Cancelar reserva e cobranças\"]'); if (!dialog) return null; const rect = dialog.getBoundingClientRect(); const radios = [...dialog.querySelectorAll('input[name=\"booking-cancel-charge\"]')]; return { width: innerWidth, left: rect.left, right: rect.right, overflow: dialog.scrollWidth > dialog.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1, radios: radios.length, keepChecked: radios[0]?.checked, confirm: Boolean([...dialog.querySelectorAll('button')].find((button) => button.textContent?.includes('Confirmar cancelamento'))) }; })()",
        returnByValue: true,
      });
      const modal = confirm.result.value;
      if (!modal || modal.left < -1 || modal.right > modal.width + 1 || modal.overflow || modal.radios !== 2 || !modal.keepChecked || !modal.confirm) {
        throw new Error(`${viewport.name}: escolha de cobranças não está legível ou completa: ${JSON.stringify(modal)}`);
      }
      if (choice === "void") await send("Runtime.evaluate", { expression: "document.querySelectorAll('[role=dialog][aria-label=\"Cancelar reserva e cobranças\"] input[name=\"booking-cancel-charge\"]')[1].click()" });
      const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
      await writeFile(`${outputDir}/${viewport.name}-agenda-cancelamento-${choice}.png`, Buffer.from(shot.data, "base64"));
      await send("Runtime.evaluate", { expression: "[...document.querySelectorAll('[role=dialog][aria-label=\"Cancelar reserva e cobranças\"] button')].find((button) => button.textContent?.includes('Confirmar cancelamento'))?.click()" });
      let resultingStatus;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const [booking, charge] = await Promise.all([
          db.scheduleOccurrence.findUniqueOrThrow({ where: { id: occurrenceId }, select: { status: true } }),
          db.financialEntry.findUniqueOrThrow({ where: { id: `${occurrenceId}-charge` }, select: { status: true } }),
        ]);
        resultingStatus = { booking: booking.status, charge: charge.status };
        if (booking.status === "CANCELED" && charge.status === (choice === "keep" ? "PENDING" : "VOIDED")) break;
        await pause(250);
      }
      if (resultingStatus?.booking !== "CANCELED" || resultingStatus.charge !== (choice === "keep" ? "PENDING" : "VOIDED")) {
        throw new Error(`${viewport.name}: cancelamento não respeitou a escolha sobre a cobrança: ${JSON.stringify(resultingStatus)}`);
      }
      console.log(`${viewport.name}: reserva cancelada e cobrança ${choice === "keep" ? "mantida" : "cancelada"} conforme escolha explícita.`);
    }
    const mobile = viewports[1];
    const betaBody = await visit("/jogadores", mobile, arenaB.id, "mobile-clients-arena-b");
    const alphaBody = await visit("/jogadores", mobile, arenaA.id, "mobile-clients-arena-a");
    if (!betaBody.includes("Atleta Exclusivo Outra Arena GOAL") || betaBody.includes("Atleta GOAL A") ||
        !alphaBody.includes("Atleta GOAL A") || alphaBody.includes("Atleta Exclusivo Outra Arena GOAL")) {
      throw new Error("A lista de clientes não respeitou a arena selecionada.");
    }
    console.log("Isolamento entre arenas validado na lista de clientes.");

    await visit("/usuarios", mobile, arenaA.id, "mobile-users-recovery");
    const recoveryTrigger = await send("Runtime.evaluate", {
      expression: "(() => { const row = [...document.querySelectorAll('tr')].find((item) => item.innerText.includes('goal-staff@example.test')); const button = [...(row?.querySelectorAll('button') ?? [])].find((item) => item.textContent?.trim() === 'Recuperar acesso'); button?.click(); return Boolean(button); })()",
      returnByValue: true,
    });
    if (!recoveryTrigger.result.value) throw new Error("Proprietário não encontrou a recuperação do colaborador na lista de usuários.");
    let recoveryUrl = "";
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const response = await send("Runtime.evaluate", {
        expression: "document.querySelector('input[id^=\"recovery-link-\"]')?.value ?? ''",
        returnByValue: true,
      });
      recoveryUrl = response.result.value;
      if (recoveryUrl) break;
      await pause(250);
    }
    const recoveryToken = new URL(recoveryUrl || baseUrl).searchParams.get("token");
    if (!recoveryUrl.startsWith(`${baseUrl}/redefinir-senha?`) || !/^[a-f0-9]{64}$/i.test(recoveryToken ?? "")) {
      throw new Error("O link privado de recuperação não foi gerado pela interface.");
    }
    await send("Page.navigate", { url: recoveryUrl });
    let resetReady = false;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const response = await send("Runtime.evaluate", {
        expression: "location.pathname === '/redefinir-senha' && Boolean(document.querySelector('input[name=password]') && document.querySelector('input[name=confirmPassword]'))",
        returnByValue: true,
      });
      resetReady = response.result.value;
      if (resetReady) break;
      await pause(250);
    }
    if (!resetReady) throw new Error("O link privado não abriu o formulário de nova senha.");
    await send("Runtime.evaluate", { expression: "document.querySelector('input[name=password]').focus()" });
    await send("Input.insertText", { text: "SenhaRecuperadaGOAL123!" });
    await send("Runtime.evaluate", { expression: "document.querySelector('input[name=confirmPassword]').focus()" });
    await send("Input.insertText", { text: "SenhaRecuperadaGOAL123!" });
    await send("Runtime.evaluate", { expression: "document.querySelector('form button[type=submit]').click()" });
    let resetSuccess = false;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const response = await send("Runtime.evaluate", {
        expression: "document.body?.innerText.includes('Senha redefinida. Entre novamente com a nova senha.') ?? false",
        returnByValue: true,
      });
      resetSuccess = response.result.value;
      if (resetSuccess) break;
      await pause(250);
    }
    if (!resetSuccess) throw new Error("A redefinição de senha não confirmou sucesso na interface.");
    console.log("Recuperação manual do colaborador concluída no navegador com link privado descartável.");

    for (const viewport of viewports) {
      await send("Network.clearBrowserCookies");
      await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.name === "mobile" });
      await send("Page.navigate", { url: `${baseUrl}/login` });
      let loginPage;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const response = await send("Runtime.evaluate", {
          expression: "({path:location.pathname,ready:document.readyState,form:Boolean(document.querySelector('#email') && document.querySelector('#password')),width:innerWidth,scrollWidth:document.documentElement.scrollWidth})",
          returnByValue: true,
        });
        loginPage = response.result.value;
        if (loginPage.path === "/login" && loginPage.ready === "complete" && loginPage.form) break;
        await pause(250);
      }
      if (loginPage.path !== "/login" || !loginPage.form || loginPage.scrollWidth > loginPage.width + 1) {
        throw new Error(`${viewport.name}: formulário de login indisponível ou com overflow: ${JSON.stringify(loginPage)}`);
      }
      await pause(600);
      const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
      await writeFile(`${outputDir}/${viewport.name}-login.png`, Buffer.from(shot.data, "base64"));
    }

    await send("Runtime.evaluate", { expression: "document.querySelector('#email').focus()" });
    await send("Input.insertText", { text: "goal-staff@example.test" });
    await send("Runtime.evaluate", { expression: "document.querySelector('#password').focus()" });
    await send("Input.insertText", { text: "SenhaDescartavelGOAL123!" });
    await send("Runtime.evaluate", { expression: "document.querySelector('form button[type=submit]').click()" });
    let oldPasswordRejected = false;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const response = await send("Runtime.evaluate", {
        expression: "location.pathname === '/login' && (document.body?.innerText.includes('E-mail ou senha inválidos.') ?? false)",
        returnByValue: true,
      });
      oldPasswordRejected = response.result.value;
      if (oldPasswordRejected) break;
      await pause(250);
    }
    if (!oldPasswordRejected) throw new Error("A senha antiga do colaborador continuou válida após a recuperação.");
    await send("Page.navigate", { url: `${baseUrl}/login` });
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const response = await send("Runtime.evaluate", {
        expression: "location.pathname === '/login' && Boolean(document.querySelector('#email') && document.querySelector('#password'))",
        returnByValue: true,
      });
      if (response.result.value) break;
      await pause(250);
    }
    await pause(400);
    await send("Runtime.evaluate", { expression: "document.querySelector('#email').focus()" });
    await send("Input.insertText", { text: "goal-staff@example.test" });
    await send("Runtime.evaluate", { expression: "document.querySelector('#password').focus()" });
    await send("Input.insertText", { text: "SenhaRecuperadaGOAL123!" });
    await send("Runtime.evaluate", { expression: "document.querySelector('form button[type=submit]').click()" });
    let staffLogin;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const response = await send("Runtime.evaluate", { expression: "({path:location.pathname,body:document.body?.innerText ?? ''})", returnByValue: true });
      staffLogin = response.result.value;
      if (staffLogin.path === "/painel") break;
      await pause(250);
    }
    if (staffLogin.path !== "/painel" || !staffLogin.body.includes("Arena Teste GOAL")) {
      throw new Error(`Login do administrador fictício falhou: ${JSON.stringify(staffLogin).slice(0, 500)}`);
    }
    const cookies = await send("Network.getCookies", { urls: [baseUrl] });
    const staffSessionToken = cookies.cookies.find((item) => item.name === "padel_session")?.value;
    if (!staffSessionToken) throw new Error("Login não criou sessão.");

    for (const path of ["/whatsapp", "/jogadores"]) {
      await send("Page.navigate", { url: `${baseUrl}${path}` });
      let page;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const response = await send("Runtime.evaluate", { expression: "({path:location.pathname,body:document.body?.innerText ?? '',ready:document.readyState})", returnByValue: true });
        page = response.result.value;
        if (page.path === path && page.ready === "complete" && page.body.length > 80) break;
        await pause(250);
      }
      if (page.path !== path || page.body.length < 80) throw new Error(`Administrador fictício não acessou ${path}: ${JSON.stringify(page).slice(0, 500)}`);
      if (path === "/jogadores" && (!page.body.includes("Atleta GOAL A") || page.body.includes("Atleta Exclusivo Outra Arena GOAL"))) {
        throw new Error("Administrador fictício visualizou clientes de outra arena.");
      }
    }
    const clickElement = async (selector) => {
      let point;
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const evaluated = await send("Runtime.evaluate", {
          expression: `(() => { const element = Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find((candidate) => { const rect = candidate.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; }); if (!element) return null; element.scrollIntoView({ block: 'center' }); const rect = element.getBoundingClientRect(); const x = rect.left + rect.width / 2; const y = rect.top + rect.height / 2; const hit = document.elementFromPoint(x, y); return { x, y, width: rect.width, height: rect.height, hitMatches: Boolean(hit && element.contains(hit)), hitHref: hit?.closest('a[href]')?.getAttribute('href') ?? null, viewport: [innerWidth, innerHeight], scrollY }; })()`,
          returnByValue: true,
        });
        point = evaluated.result.value;
        if (point?.width > 0 && point?.height > 0 && point.hitMatches) break;
        await pause(250);
      }
      if (!point || point.width < 1 || point.height < 1 || !point.hitMatches) throw new Error(`Controle de navegação não clicável: ${selector}: ${JSON.stringify(point)}`);
      await send("Runtime.evaluate", { expression: "window.__lastSyntheticClick = null; document.addEventListener('click', (event) => { const target = event.target; const href = target instanceof Element ? target.closest('a[href]')?.getAttribute('href') ?? null : null; setTimeout(() => { window.__lastSyntheticClick = { href, defaultPrevented: event.defaultPrevented }; }, 0); }, { once: true });" });
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
      return point;
    };
    for (const viewport of viewports) {
      await selectArena(arenaA.id, staffSessionToken);
      await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.name === "mobile" });
      await send("Page.navigate", { url: `${baseUrl}/painel` });
      let start;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const response = await send("Runtime.evaluate", { expression: "({path:location.pathname,menu:Boolean(document.querySelector('#arena-mobile-navigation a[href=\"/jogadores\"]'))})", returnByValue: true });
        start = response.result.value;
        if (start.path === "/painel" && start.menu) break;
        await pause(250);
      }
      if (start.path !== "/painel" || !start.menu) throw new Error(`${viewport.name}: menu lateral não carregou.`);
      if (viewport.name === "mobile") {
        let hydrated = false;
        for (let attempt = 0; attempt < 40; attempt += 1) {
          const response = await send("Runtime.evaluate", { expression: "(() => { const button=document.querySelector('button[aria-label=\"Abrir menu\"]'); return Boolean(button && Object.keys(button).some(key => key.startsWith('__reactProps$'))); })()", returnByValue: true });
          if (response.result.value) { hydrated = true; break; }
          await pause(100);
        }
        if (!hydrated) throw new Error("O menu mobile não ficou interativo após o carregamento.");
        await clickElement('button[aria-label="Abrir menu"]');
        let menu;
        for (let attempt = 0; attempt < 20; attempt += 1) {
          const response = await send("Runtime.evaluate", { expression: "({open:document.querySelector('button[aria-label=\"Abrir menu\"]')?.getAttribute('aria-expanded'),sidebar:document.querySelector('#arena-mobile-navigation')?.getBoundingClientRect().width})", returnByValue: true });
          menu = response.result.value;
          if (menu.open === "true") break;
          await pause(100);
        }
        if (menu.open !== "true" || menu.sidebar < 200) throw new Error(`Menu mobile não abriu: ${JSON.stringify(menu)}`);
        await pause(300);
      }
      await clickElement('#arena-mobile-navigation a[href="/jogadores"]');
      let navigated;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const response = await send("Runtime.evaluate", { expression: "({path:location.pathname,body:document.querySelector('main')?.innerText ?? '',menuOpen:document.querySelector('button[aria-label=\"Abrir menu\"]')?.getAttribute('aria-expanded'),bodyOverflow:document.body.style.overflow})", returnByValue: true });
        navigated = response.result.value;
        if (navigated.path === "/jogadores" && navigated.body.includes("Atleta GOAL A") && navigated.menuOpen !== "true" && navigated.bodyOverflow !== "hidden") break;
        await pause(250);
      }
      if (navigated.path !== "/jogadores" || !navigated.body.includes("Atleta GOAL A") || navigated.menuOpen === "true" || navigated.bodyOverflow === "hidden") {
        throw new Error(`${viewport.name}: navegação pelo menu lateral falhou: ${JSON.stringify(navigated).slice(0, 500)}`);
      }
      console.log(`${viewport.name}: colaborador abriu Clientes pelo menu lateral e liberou a rolagem.`);
      await visit("/jogadores", viewport, arenaA.id, `${viewport.name}-owner-navigation-ready`);
      const ownerMenu = await send("Runtime.evaluate", { expression: "Boolean(document.querySelector('#arena-mobile-navigation a[href=\"/agenda\"]'))", returnByValue: true });
      if (!ownerMenu.result.value) throw new Error(`${viewport.name}: menu completo do proprietário não carregou.`);
      for (const destination of ["/agenda", "/torneios", "/financeiro/contas-a-receber"]) {
        if (viewport.name === "mobile") {
          await clickElement('button[aria-label="Abrir menu"]');
          let menuOpen = false;
          for (let attempt = 0; attempt < 20; attempt += 1) {
            const response = await send("Runtime.evaluate", { expression: "document.querySelector('button[aria-label=\"Abrir menu\"]')?.getAttribute('aria-expanded') === 'true'", returnByValue: true });
            menuOpen = response.result.value;
            if (menuOpen) break;
            await pause(100);
          }
          if (!menuOpen) throw new Error(`${viewport.name}: menu não reabriu antes de ${destination}.`);
        }
        if (destination.startsWith("/financeiro/")) {
          const response = await send("Runtime.evaluate", { expression: "document.querySelector('#arena-mobile-navigation button[aria-label=\"Abrir submenu Financeiro\"]') !== null", returnByValue: true });
          if (response.result.value) {
            await clickElement('#arena-mobile-navigation button[aria-label="Abrir submenu Financeiro"]');
            await pause(200);
          }
        }
        const clickPoint = await clickElement(`#arena-mobile-navigation a[href="${destination}"]`);
        let result;
        for (let attempt = 0; attempt < 80; attempt += 1) {
          const response = await send("Runtime.evaluate", { expression: "({path:location.pathname,body:document.querySelector('main')?.innerText ?? '',menuOpen:document.querySelector('button[aria-label=\"Abrir menu\"]')?.getAttribute('aria-expanded'),bodyOverflow:document.body.style.overflow})", returnByValue: true });
          result = response.result.value;
          if (result.path === destination && result.body.length > 100 && result.menuOpen !== "true" && result.bodyOverflow !== "hidden") break;
          await pause(250);
        }
        if (result.path !== destination || result.body.length <= 100 || result.menuOpen === "true" || result.bodyOverflow === "hidden") {
          const clickEvent = await send("Runtime.evaluate", { expression: "window.__lastSyntheticClick ?? null", returnByValue: true });
          throw new Error(`${viewport.name}: navegação para ${destination} falhou: ${JSON.stringify({ clickPoint, clickEvent: clickEvent.result.value, result }).slice(0, 1000)}`);
        }
        await pause(500);
      }
      console.log(`${viewport.name}: navegação sucessiva por Grade, Torneios e Contas a Receber funcionou.`);
    }
    await selectArena(arenaB.id, staffSessionToken);
    await send("Page.navigate", { url: `${baseUrl}/jogadores` });
    let switched;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const response = await send("Runtime.evaluate", { expression: "({path:location.pathname,body:document.body?.innerText ?? '',ready:document.readyState})", returnByValue: true });
      switched = response.result.value;
      if (switched.ready === "complete" && switched.body.length > 80) break;
      await pause(250);
    }
    if (switched.body.includes("Atleta Exclusivo Outra Arena GOAL") || !switched.body.includes("Atleta GOAL A")) {
      throw new Error("Troca indevida da arena por cookie expôs clientes alheios.");
    }
    console.log("Login real do administrador fictício, acesso ao WhatsApp e isolamento entre arenas validados.");

    await send("Network.clearBrowserCookies");
    const athleteToken = createHash("sha256").update(`goal-player:${sessionToken}`).digest("hex");
    const portalCookie = `arena_player_session=${athleteToken}`;
    const bookingDateParts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(Date.now() + 2 * 24 * 60 * 60_000)).map((part) => [part.type, part.value]));
    const bookingDate = `${bookingDateParts.year}-${bookingDateParts.month}-${bookingDateParts.day}`;
    const portalViews = [
      { label: "inicio", query: "section=home" },
      { label: "avisos", query: "section=announcements" },
      { label: "financas", query: "section=finance" },
      { label: "comandas", query: "section=comandas" },
      { label: "torneios-jogos", query: "section=leagues&leagueTab=games" },
      { label: "torneios-duplas", query: "section=leagues&leagueTab=pairs" },
      { label: "torneios-ranking", query: "section=leagues&leagueTab=ranking" },
      { label: "super12", query: "section=leagues&eventTab=super12" },
      { label: "reservar", query: `section=booking&data=${bookingDate}` },
      { label: "reservas", query: "section=reservations" },
      { label: "aulas", query: "section=lessons" },
      { label: "turmas", query: "section=classes" },
      { label: "radar", query: "section=radar" },
      { label: "perfil", query: "section=profile" },
    ];
    const portalContrastSelectors = {
      avisos: [".portal-announcements-feed > p.muted"],
      super12: [".super12-empty strong", ".super12-empty p"],
      reservas: [".portal-activity-list article strong", ".portal-activity-list article span", ".portal-activity-list article b"],
      perfil: [".avatar-crop-field > small"],
    };
    // Check readable text against the rendered surface rather than pinning the old theme's RGB values.
    const measurePortalContrast = (selectors) => {
      const parse = value => { const parts=value.match(/[\d.]+/g)?.map(Number); return parts?.length>=3 ? parts : null; };
      const luminance = color => { const c=color.slice(0,3).map(value=>{const v=value/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
      const backgrounds = element => {
        for(let node=element;node;node=node.parentElement){
          const style=getComputedStyle(node);
          const gradient=(style.backgroundImage.match(/rgba?\([^)]*\)/g)??[]).map(parse).filter(color=>color&&(color.length===3||color[3]===1));
          if(gradient.length)return gradient;
          const color=parse(style.backgroundColor);if(color&&(color.length===3||color[3]===1))return [color];
        }
        return [[255,255,255]];
      };
      return selectors.map(selector=>{
        const element=[...document.querySelectorAll(selector)].find(node=>node.getBoundingClientRect().width>0&&node.getBoundingClientRect().height>0);
        if(!element)return {selector,missing:true};
        const style=getComputedStyle(element);const fg=parse(style.color);const size=parseFloat(style.fontSize);const threshold=size>=24||(size>=18.66&&Number(style.fontWeight)>=700)?3:4.5;
        const ratios=backgrounds(element).map(bg=>{const a=luminance(fg),b=luminance(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});
        return {selector,color:style.color,contrast:Math.min(...ratios),threshold};
      });
    };
    for (const viewport of viewports) {
      for (const theme of viewport.name === "mobile" ? ["light", "dark"] : ["light"]) {
        await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.name === "mobile" });
        await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
        await send("Network.setCookie", { name: "arena_player_session", value: athleteToken, url: baseUrl, httpOnly: true, sameSite: "Lax" });
        for (const view of portalViews) {
          const path = `/home?arena=arena-teste-goal&${view.query}`;
          const label = `portal-${viewport.name}-${theme}-${view.label}`;
          const response = await fetch(`${baseUrl}${path}`, { headers: { Cookie: portalCookie }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
          await response.body?.cancel();
          if (response.status !== 200) throw new Error(`${label}: HTTP ${response.status}`);
          await send("Page.navigate", { url: `${baseUrl}${path}` });
          let metrics;
          for (let attempt = 0; attempt < 60; attempt += 1) {
            const evaluated = await send("Runtime.evaluate", {
              expression: "({path:location.pathname,section:new URLSearchParams(location.search).get('section'),width:innerWidth,scrollWidth:document.documentElement.scrollWidth,body:document.body?.innerText ?? '',main:document.querySelector('main')?.innerText ?? '',authenticated:Boolean(document.querySelector('nav[aria-label=\"Atalhos principais\"]')),ready:document.readyState})",
              returnByValue: true,
            });
            metrics = evaluated.result.value;
            if (metrics?.path === "/home" && metrics.section === view.query.split("&", 1)[0].split("=")[1] && metrics.ready === "complete" && metrics.authenticated && metrics.main.trim().length >= 40) break;
            await pause(200);
          }
          await pause(500);
          const settled = await send("Runtime.evaluate", {
            expression: "({path:location.pathname,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,body:document.body?.innerText ?? '',main:document.querySelector('main')?.innerText ?? '',authenticated:Boolean(document.querySelector('nav[aria-label=\"Atalhos principais\"]'))})",
            returnByValue: true,
          });
          metrics = settled.result.value;
          const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: view.label === "torneios-jogos" && viewport.name === "desktop" });
          await writeFile(`${outputDir}/${label}.png`, Buffer.from(shot.data, "base64"));
          if (metrics.path !== "/home" || !metrics.authenticated || metrics.main.trim().length < 40 || metrics.scrollWidth > metrics.width + 1 || /Algo saiu do fluxo|Application error|Internal Server Error/i.test(metrics.body) || metrics.body.includes("Receita beta GOAL")) {
            throw new Error(`${label}: portal inválido: ${JSON.stringify({ path: metrics.path, authenticated: metrics.authenticated, mainLength: metrics.main.trim().length, width: metrics.width, scrollWidth: metrics.scrollWidth })}`);
          }
          const contrastSelectors=portalContrastSelectors[view.label];
          if(contrastSelectors){
            const rendered=await send("Runtime.evaluate",{expression:`(${measurePortalContrast.toString()})(${JSON.stringify(contrastSelectors)})`,returnByValue:true});
            for(const check of rendered.result.value??[]) if(check.missing||check.contrast<check.threshold) throw new Error(`${label}: contraste insuficiente: ${JSON.stringify(check)}`);
          }
          if (view.label === "inicio" && (!metrics.main.includes(viewport.name === "mobile" ? "Comanda em aberto" : "em aberto") || metrics.main.includes("Tudo em dia"))) {
            throw new Error(`${label}: a tela inicial ignora a comanda aberta do atleta fictício.`);
          }
          if (view.label === "inicio" && viewport.name === "mobile") {
            await clickElement('button[aria-label="Notificações"]');
            let notificationPanel;
            for (let attempt = 0; attempt < 30; attempt += 1) {
              const evaluated = await send("Runtime.evaluate", {
                expression: "(() => { const panel=document.querySelector('[role=dialog][aria-label=\"Notificações\"]'); if(!panel) return null; const rect=panel.getBoundingClientRect(); return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height,viewportWidth:innerWidth,viewportHeight:innerHeight,content:panel.innerText}; })()",
                returnByValue: true,
              });
              notificationPanel = evaluated.result.value;
              if (notificationPanel?.width > 200) break;
              await pause(100);
            }
            if (!notificationPanel || notificationPanel.left < 0 || notificationPanel.right > notificationPanel.viewportWidth + 1 || notificationPanel.top < 0 || notificationPanel.bottom > notificationPanel.viewportHeight + 1 || notificationPanel.height < 120 || !notificationPanel.content.includes("Notificações")) {
              throw new Error(`${label}: notificações cortadas ou ausentes: ${JSON.stringify(notificationPanel)}`);
            }
            const notificationShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
            await writeFile(`${outputDir}/${label}-notificacoes.png`, Buffer.from(notificationShot.data, "base64"));
            await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
            await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
            let closed = false;
            for (let attempt = 0; attempt < 20; attempt += 1) {
              const evaluated = await send("Runtime.evaluate", { expression: "!document.querySelector('[role=dialog][aria-label=\"Notificações\"]')", returnByValue: true });
              closed = Boolean(evaluated.result.value);
              if (closed) break;
              await pause(100);
            }
            if (!closed) throw new Error(`${label}: notificações não fecharam ao pressionar Esc.`);
          }
          if (view.label === "financas" && viewport.name === "mobile" && (!metrics.main.includes("Itens em aberto") || !metrics.main.includes("Você tem uma comanda aberta para acompanhar") || metrics.main.includes("Seus pagamentos estão em dia"))) {
            throw new Error(`${label}: resumo financeiro contradiz a comanda aberta do atleta fictício.`);
          }
          if (view.label === "financas" && viewport.name === "desktop" && (!metrics.main.includes("Comanda em aberto") || metrics.main.includes("Tudo certo por aqui"))) {
            throw new Error(`${label}: destaque financeiro contradiz a comanda aberta do atleta fictício.`);
          }
          if (view.label === "torneios-jogos" && (!metrics.body.includes("Parceira de Nome Comprido GOAL") || !metrics.body.includes("6–2 · 6–3"))) {
            throw new Error(`${label}: placar e games da liga fictícia não aparecem juntos.`);
          }
          if (view.label === "reservar" && !metrics.body.includes("Quadra GOAL Agenda")) {
            throw new Error(`${label}: os horários disponíveis da quadra fictícia não aparecem.`);
          }
          if (view.label === "reservas" && !metrics.body.includes("Próxima reserva GOAL")) {
            throw new Error(`${label}: a reserva futura do atleta fictício não aparece.`);
          }
          if (view.label === "turmas" && (!metrics.body.includes("Professora de Nome Comprido GOAL") || !metrics.body.includes("Turma GOAL Iniciante - Manhã") || !metrics.body.includes("07:30") || metrics.body.includes("Turma Exclusiva Outra Arena GOAL"))) {
            throw new Error(`${label}: a turma e seus horários fictícios não aparecem corretamente ou houve vazamento entre arenas.`);
          }
          if (view.label === "turmas" && viewport.name === "mobile" && theme === "light") {
            await clickElement('a[aria-label="Quarta"]');
            await pause(300);
            const wednesday = await send("Runtime.evaluate", { expression: "document.querySelector('main')?.innerText ?? ''", returnByValue: true });
            if (!wednesday.result.value.includes("Quarta") || !wednesday.result.value.includes("Turma GOAL Iniciante - Manhã") || !wednesday.result.value.includes("07:30")) {
              throw new Error(`${label}: a seleção de quarta-feira não mostrou a turma e seu horário.`);
            }
            const dayShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
            await writeFile(`${outputDir}/${label}-quarta.png`, Buffer.from(dayShot.data, "base64"));
          }
          if (view.label === "torneios-jogos" && viewport.name === "mobile" && theme === "light") {
            await clickElement('button[aria-label="Próxima semana"]');
            await pause(300);
            const weekTwo = await send("Runtime.evaluate", { expression: "document.querySelector('main')?.innerText ?? ''", returnByValue: true });
            if (!weekTwo.result.value.includes("Semana 2 de 4") || !weekTwo.result.value.includes("Daniela GOAL")) {
              throw new Error(`${label}: o seletor da segunda semana não mostrou o jogo esperado.`);
            }
            const weekShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
            await writeFile(`${outputDir}/${label}-semana-2.png`, Buffer.from(weekShot.data, "base64"));
            await clickElement('button[aria-label="Semana anterior"]');
            await pause(300);
            const weekOne = await send("Runtime.evaluate", { expression: "document.querySelector('main')?.innerText ?? ''", returnByValue: true });
            if (!weekOne.result.value.includes("Semana 1 de 4") || !weekOne.result.value.includes("6–2 · 6–3")) {
              throw new Error(`${label}: o seletor não voltou ao resultado da primeira semana.`);
            }
          }
          console.log(`${label}: HTTP 200, sessão fictícia válida e sem overflow horizontal`);
        }
      }
    }
    await send("Emulation.setDeviceMetricsOverride", { width: 320, height: 700, deviceScaleFactor: 1, mobile: true });
    for (const theme of ["light", "dark"]) {
      await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
      for (const view of portalViews) {
        const label = `portal-mobile-320-${theme}-${view.label}`;
        await send("Page.navigate", { url: `${baseUrl}/home?arena=arena-teste-goal&${view.query}` });
        let compact;
        for (let attempt = 0; attempt < 60; attempt += 1) {
          const evaluated = await send("Runtime.evaluate", {
            expression: "({path:location.pathname,section:new URLSearchParams(location.search).get('section'),width:innerWidth,scrollWidth:document.documentElement.scrollWidth,main:document.querySelector('main')?.innerText ?? '',authenticated:Boolean(document.querySelector('nav[aria-label=\"Atalhos principais\"]')),ready:document.readyState})",
            returnByValue: true,
          });
          compact = evaluated.result.value;
          if (compact?.path === "/home" && compact.section === view.query.split("&", 1)[0].split("=")[1] && compact.ready === "complete" && compact.authenticated && compact.main.trim().length >= 40) break;
          await pause(200);
        }
        await pause(300);
        const measured = await send("Runtime.evaluate", { expression: "({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,main:document.querySelector('main')?.innerText ?? ''})", returnByValue: true });
        compact = { ...compact, ...measured.result.value };
        if (compact.path !== "/home" || compact.section !== view.query.split("&", 1)[0].split("=")[1] || !compact.authenticated || compact.main.trim().length < 40 || compact.scrollWidth > compact.width + 1) {
          throw new Error(`${label}: conteúdo cortado ou sessão inválida: ${JSON.stringify({ path: compact.path, section: compact.section, authenticated: compact.authenticated, width: compact.width, scrollWidth: compact.scrollWidth, mainLength: compact.main.trim().length })}`);
        }
        if (view.label === "torneios-jogos") {
          const leagueLayout = await send("Runtime.evaluate", { expression: "(() => { const selectors = ['.athlete-portal-events-shell', '.public-league-portal', '.portal-league-category-card', '.portal-league-category-card select', 'button[aria-label=\"Próxima semana\"]', 'article[id^=\"jogo-\"]']; return selectors.map(selector => { const element = document.querySelector(selector); const rect = element?.getBoundingClientRect(); const style = element && getComputedStyle(element); return {selector, left:rect?.left, right:rect?.right, boxSizing:style?.boxSizing, padding:style?.padding}; }); })()", returnByValue: true });
          if (leagueLayout.result.value.some(({ left, right }) => left == null || right == null || left < 0 || right > compact.width - 4)) {
            throw new Error(`${label}: seletor de semanas ou jogos ultrapassou a área visível: ${JSON.stringify(leagueLayout.result.value)}`);
          }
        }
        if (view.label === "inicio") {
          await clickElement('button[aria-label="Notificações"]');
          let panel;
          for (let attempt = 0; attempt < 30; attempt += 1) {
            const evaluated = await send("Runtime.evaluate", {
              expression: "(() => { const dialog = document.querySelector('[role=dialog][aria-label=\"Notificações\"]'); if (!dialog) return null; const rect = dialog.getBoundingClientRect(); const buttons = [...dialog.querySelectorAll('button')].filter(button => button.getClientRects().length).map(button => { const box = button.getBoundingClientRect(); return { left: box.left, right: box.right, top: box.top, bottom: box.bottom }; }); return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height, viewportHeight: innerHeight, scrollWidth: dialog.scrollWidth, clientWidth: dialog.clientWidth, buttons, text: dialog.innerText }; })()",
              returnByValue: true,
            });
            panel = evaluated.result.value;
            if (panel?.width > 200) break;
            await pause(100);
          }
          if (!panel || panel.left < 0 || panel.right > compact.width + 1 || panel.top < 0 || panel.bottom > panel.viewportHeight + 1 || panel.scrollWidth > panel.clientWidth + 1 || !panel.text.includes("Notificações") || panel.buttons.some((button) => button.left < panel.left - 1 || button.right > panel.right + 1)) {
            throw new Error(`${label}: notificações ou ações cortadas em 320 px: ${JSON.stringify(panel)}`);
          }
          const notificationShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
          await writeFile(`${outputDir}/${label}-notificacoes.png`, Buffer.from(notificationShot.data, "base64"));
          await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
          await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
          let closed = false;
          for (let attempt = 0; attempt < 20; attempt += 1) {
            const evaluated = await send("Runtime.evaluate", { expression: "!document.querySelector('[role=dialog][aria-label=\"Notificações\"]')", returnByValue: true });
            closed = Boolean(evaluated.result.value);
            if (closed) break;
            await pause(100);
          }
          if (!closed) throw new Error(`${label}: Esc não fechou notificações em 320 px.`);
        }
        const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
        await writeFile(`${outputDir}/${label}.png`, Buffer.from(shot.data, "base64"));
      }
    }
    const betaResponse = await fetch(`${baseUrl}/classificacao/arena-beta-goal?section=finance`, { headers: { Cookie: portalCookie }, signal: AbortSignal.timeout(20_000) });
    const betaHtml = await betaResponse.text();
    if (betaResponse.status !== 200 || !betaHtml.includes("Seu espaço dentro e fora da quadra.") || betaHtml.includes("Receita beta GOAL")) {
      throw new Error("A sessão do atleta da arena A obteve conteúdo privado da arena B.");
    }
    console.log("Portal do Atleta validado em desktop, celular claro/escuro e sem dados financeiros de outra arena.");

    const bookingCourt = await db.court.findFirstOrThrow({ where: { arenaId: arenaA.id }, select: { id: true } });
    const bookingPlayer = await db.player.findFirstOrThrow({ where: { id: "goal-athlete-a", arenaId: arenaA.id }, select: { id: true } });
    const bookingStartsAt = new Date(Date.now() + 4 * 24 * 60 * 60_000);
    const bookingFixture = (createdAt) => ({
      arenaId: arenaA.id, sourceType: "ONLINE_BOOKING", title: "Reserva online GOAL",
      status: "PENDING_PAYMENT", createdAt, startsAt: bookingStartsAt,
      endsAt: new Date(bookingStartsAt.getTime() + 60 * 60_000),
      occurrenceCourts: { create: { courtId: bookingCourt.id } },
      participants: { create: { playerId: bookingPlayer.id, amountCents: 5000 } },
    });
    const activeBooking = await db.scheduleOccurrence.create({ data: bookingFixture(new Date(Date.now() - 10 * 60_000)) });
    const visitBookingPayment = async (booking, viewport, label) => {
      const path = `/reservar/arena-teste-goal/pagamento/${booking.id}`;
      const response = await fetch(`${baseUrl}${path}`, { headers: { Cookie: portalCookie }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
      await response.body?.cancel();
      if (response.status !== 200) throw new Error(`${label}: HTTP ${response.status} na página da reserva.`);
      await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.name !== "desktop" });
      await send("Network.setCookie", { name: "arena_player_session", value: athleteToken, url: baseUrl, httpOnly: true, sameSite: "Lax" });
      await send("Page.navigate", { url: `${baseUrl}${path}` });
      let state;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const result = await send("Runtime.evaluate", { expression: "({path:location.pathname,body:document.body?.innerText ?? '',width:innerWidth,scrollWidth:document.documentElement.scrollWidth,buttons:[...document.querySelectorAll('.public-booking-payment-options button')].length})", returnByValue: true });
        state = result.result.value;
        if (state.path === path && state.buttons === 3 && state.body.includes("Tempo para pagar:")) break;
        await pause(200);
      }
      if (state.path !== path || state.buttons !== 3 || !state.body.includes("Tempo para pagar:") || state.scrollWidth > state.width + 1) {
        throw new Error(`${label}: formas de pagamento, prazo ou layout da reserva inválidos: ${JSON.stringify(state)}`);
      }
      const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
      await writeFile(`${outputDir}/${label}.png`, Buffer.from(shot.data, "base64"));
    };
    for (const viewport of [...viewports, { name: "mobile-320", width: 320, height: 700 }]) await visitBookingPayment(activeBooking, viewport, `${viewport.name}-public-booking-payment-active`);
    const expiringBooking = await db.scheduleOccurrence.create({ data: bookingFixture(new Date(Date.now() - 14 * 60_000 - 35_000)) });
    await visitBookingPayment(expiringBooking, viewports[0], "desktop-public-booking-payment-expiring");
    await pause(25_000);
    let expiredBookingState;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const result = await send("Runtime.evaluate", { expression: "({body:document.body?.innerText ?? '',buttons:[...document.querySelectorAll('.public-booking-payment-options button')].length})", returnByValue: true });
      expiredBookingState = result.result.value;
      if (expiredBookingState.body.includes("Reserva indisponível")) break;
      await pause(300);
    }
    if (!expiredBookingState.body.includes("Reserva indisponível") || expiredBookingState.buttons !== 0) {
      throw new Error(`A reserva aberta não bloqueou as formas de pagamento após 15 minutos: ${JSON.stringify(expiredBookingState)}`);
    }
    console.log("Pagamento de reserva fictícia validado em desktop/celular e após o fim do prazo sem recarregar a aba.");

    await send("Emulation.setDeviceMetricsOverride", { width: viewports[1].width, height: viewports[1].height, deviceScaleFactor: 1, mobile: true });
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
    await send("Network.setCookie", { name: "arena_player_session", value: athleteToken, url: baseUrl, httpOnly: true, sameSite: "Lax" });
    await send("Page.navigate", { url: `${baseUrl}/home?arena=arena-teste-goal&section=classes&weekday=1` });
    let classRequestReady = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const response = await send("Runtime.evaluate", { expression: "({body:document.body?.innerText ?? '',button:Array.from(document.querySelectorAll('form:has(input[name=\"classGroupId\"]) button[type=\"submit\"]')).some((element) => element.getBoundingClientRect().width > 0)})", returnByValue: true });
      if (response.result.value.body.includes("Turma GOAL Iniciante - Manhã") && response.result.value.button) { classRequestReady = true; break; }
      await pause(200);
    }
    if (!classRequestReady) throw new Error("O formulário para solicitar vaga não ficou interativo no portal fictício.");
    await pause(500);
    await clickElement('form:has(input[name="classGroupId"]) button[type="submit"]');
    let classRequests = [];
    for (let attempt = 0; attempt < 60; attempt += 1) {
      classRequests = await db.classGroupRequest.findMany({ where: { arenaId: arenaA.id }, select: { id: true, status: true, classGroup: { select: { name: true } }, student: { select: { playerId: true } } } });
      if (classRequests.length) break;
      await pause(250);
    }
    if (classRequests.length !== 1 || classRequests[0].status !== "PENDING" || classRequests[0].classGroup.name !== "Turma GOAL Iniciante - Manhã" || classRequests[0].student.playerId !== "goal-athlete-a" || await db.classGroupRequest.count({ where: { arenaId: arenaB.id } }) !== 0) {
      throw new Error(`Solicitação de turma criada incorretamente: ${JSON.stringify(classRequests)}`);
    }
    await send("Page.navigate", { url: `${baseUrl}/home?arena=arena-teste-goal&section=classes&weekday=1` });
    let classRequestPending = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const response = await send("Runtime.evaluate", { expression: "document.querySelector('main')?.innerText ?? ''", returnByValue: true });
      if (response.result.value.includes("Solicitação enviada")) { classRequestPending = true; break; }
      await pause(200);
    }
    if (!classRequestPending || await db.classGroupRequest.count({ where: { arenaId: arenaA.id } }) !== 1) {
      throw new Error("O portal não exibiu o pedido pendente ou criou uma segunda solicitação.");
    }
    console.log("Pedido real de vaga fictícia registrado uma vez na arena correta e exibido como pendente no portal.");

    const publicTournament = await db.tournament.create({ data: {
      arenaId: arenaA.id, name: "Torneio público GOAL", publicSlug: `goal-public-${randomUUID()}`,
    } });
    const publicCategory = await db.tournamentCategory.create({ data: { tournamentId: publicTournament.id, name: "Categoria GOAL", level: 1 } });
    const publicPath = `/inscricao/${publicTournament.publicSlug}`;
    for (const viewport of adminViewports) {
      const formBody = await visit(publicPath, viewport, arenaA.id, `${viewport.name}-inscricao-publica-formulario`);
      if (!formBody.includes("Torneio público GOAL") || !formBody.includes("Categoria GOAL") || !formBody.includes("Ir para pagamento")) {
        throw new Error(`${viewport.name}: formulário público do torneio fictício incompleto.`);
      }
      const formLayout = await send("Runtime.evaluate", {
        expression: "(() => { const form = document.querySelector('form:has(input[name=tournamentSlug])'); const controls = [...(form?.querySelectorAll('input:not([type=hidden]), select, button[type=submit]') ?? [])]; return { width: innerWidth, controls: controls.map(control => { const rect = control.getBoundingClientRect(); return { name: control.getAttribute('name'), left: rect.left, right: rect.right, width: rect.width }; }) }; })()",
        returnByValue: true,
      });
      if (formLayout.result.value.controls.length !== 12 || formLayout.result.value.controls.some((control) => control.width < 40 || control.left < -1 || control.right > formLayout.result.value.width + 1)) {
        throw new Error(`${viewport.name}: campos da inscrição pública cortados: ${JSON.stringify(formLayout.result.value)}`);
      }
      const tabsLayout = await send("Runtime.evaluate", {
        expression: "(() => { const tabs = [...document.querySelectorAll('.public-tournament-tabs a')]; return { width: innerWidth, links: tabs.map(tab => { const rect = tab.getBoundingClientRect(); return { text: tab.textContent?.trim(), left: rect.left, right: rect.right, top: rect.top, width: rect.width }; }) }; })()",
        returnByValue: true,
      });
      const tabRects = tabsLayout.result.value.links;
      const rows = new Set(tabRects.map((tab) => Math.round(tab.top)));
      if (tabRects.length !== 4 || tabRects.some((tab) => tab.width < 70 || tab.left < -1 || tab.right > viewport.width + 1) ||
          rows.size !== (viewport.name === "desktop" ? 1 : 2)) {
        throw new Error(`${viewport.name}: abas públicas cortadas ou sem hierarquia responsiva: ${JSON.stringify(tabsLayout.result.value)}`);
      }
      for (const tab of ["inscritos", "chaveamento", "jogos"]) {
        const tabBody = await visit(`${publicPath}?tab=${tab}`, viewport, arenaA.id, `${viewport.name}-inscricao-publica-${tab}`);
        if (!tabBody.includes("Torneio público GOAL") || (tab === "inscritos" && !tabBody.includes("Categoria GOAL"))) throw new Error(`${viewport.name}: aba pública ${tab} incompleta.`);
      }
    }
    await visit(publicPath, adminViewports[2], arenaA.id, "mobile-320-inscricao-publica-preenchimento");
    const publicFormValues = {
      leadName: "Atleta Público GOAL", leadEmail: "atleta-goal@example.test", leadPhone: "11999999999",
      leadCpf: "98765432100", leadBirthDate: "01/01/1990", partnerName: "Parceiro Público GOAL",
      partnerPhone: "11988888888", partnerCpf: "98765432101", partnerBirthDate: "02/02/1991",
    };
    const publicFormPrepared = await send("Runtime.evaluate", {
      expression: `(() => { const form = document.querySelector('form:has(input[name=tournamentSlug])'); if (!form) return false; form.querySelector('select[name=categoryId]').value = ${JSON.stringify(publicCategory.id)}; for (const [name, value] of Object.entries(${JSON.stringify(publicFormValues)})) { const input = form.querySelector('input[name=' + name + ']'); if (!input) return false; input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); } return new FormData(form).get('categoryId') === ${JSON.stringify(publicCategory.id)} && form.checkValidity(); })()`,
      returnByValue: true,
    });
    if (!publicFormPrepared.result.value) throw new Error("O formulário público fictício não aceitou os dados da dupla.");
    await send("Runtime.evaluate", { expression: "document.querySelector('form:has(input[name=tournamentSlug]) button[type=submit]')?.click()" });
    let confirmedPublicRegistration;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      confirmedPublicRegistration = await db.publicTournamentRegistration.findFirst({ where: { tournamentId: publicTournament.id, leadCpf: publicFormValues.leadCpf } });
      if (confirmedPublicRegistration?.status === "CONFIRMED") break;
      await pause(250);
    }
    if (confirmedPublicRegistration?.status !== "CONFIRMED" || confirmedPublicRegistration.paymentStatus !== "PAID" || confirmedPublicRegistration.amountCents !== 0) {
      throw new Error(`A inscrição gratuita pela interface não foi confirmada: ${JSON.stringify(confirmedPublicRegistration)}`);
    }
    const publicPair = await db.pair.findFirst({ where: { tournamentId: publicTournament.id, name: "Atleta Público GOAL / Parceiro Público GOAL" } });
    if (!publicPair || await db.publicTournamentRegistration.count({ where: { tournamentId: publicTournament.id, leadCpf: publicFormValues.leadCpf } }) !== 1 ||
        await db.player.count({ where: { arenaId: arenaB.id, cpf: { in: [publicFormValues.leadCpf, publicFormValues.partnerCpf] } } }) !== 0) {
      throw new Error("A inscrição pública criou duplicidade ou não montou a dupla no torneio.");
    }
    const confirmedTab = await visit(`${publicPath}?tab=inscritos`, adminViewports[2], arenaA.id, "mobile-320-inscricao-publica-confirmada");
    if (!confirmedTab.includes("Atleta Público GOAL / Parceiro Público GOAL") || await db.publicTournamentRegistration.count({ where: { tournamentId: publicTournament.id, categoryId: publicCategory.id } }) !== 1) {
      throw new Error("A dupla confirmada não apareceu na aba pública de inscritos.");
    }
    console.log("Inscrição pública gratuita concluída no celular fictício, sem duplicidade e com dupla visível no torneio.");
    for (const viewport of adminViewports) {
      for (const [path, label] of [
        [`/torneios/${publicTournament.id}`, "detalhe"],
        [`/torneios/${publicTournament.id}/categorias`, "categorias"],
        [`/torneios/${publicTournament.id}/jogos`, "jogos"],
        [`/torneios/${publicTournament.id}/inscricoes`, "inscricoes"],
        [`/torneios/${publicTournament.id}/categorias/${publicCategory.id}`, "categoria-detalhe"],
      ]) {
        const body = await visit(path, viewport, arenaA.id, `${viewport.name}-torneio-${label}`);
        if (!body.includes("Torneio público GOAL") && !body.includes("Categoria GOAL")) throw new Error(`${viewport.name}: ${label} do torneio fictício não mostrou seus dados.`);
      }
    }
    const foreignTournament = await fetch(`${baseUrl}/torneios/${publicTournament.id}`, { headers: { Cookie: cookie(arenaB.id) }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
    const foreignTournamentBody = await foreignTournament.text();
    if (foreignTournament.status === 200 || foreignTournamentBody.includes("Torneio público GOAL")) throw new Error("A arena B conseguiu abrir o torneio privado da arena A.");
    console.log("Torneio e categoria detalhados verificados em três larguras e isolados entre arenas.");
    const registrationData = (order, status, paymentStatus, holdExpiresAt) => ({
      tournamentId: publicTournament.id, categoryId: publicCategory.id, registrationOrder: order,
      leadName: `Atleta GOAL ${order}`, leadPhone: "559999999999", leadCpf: `1111111111${order}`,
      leadBirthDate: new Date("1990-01-01"), partnerName: "Parceiro GOAL", partnerPhone: "558888888888",
      partnerCpf: `2222222222${order}`, partnerBirthDate: new Date("1991-01-01"), amountCents: 500,
      status, paymentStatus, holdExpiresAt, paymentCheckoutUrl: "https://checkout.example.test/payment",
    });
    const activeRegistration = await db.publicTournamentRegistration.create({ data: registrationData(1, "PENDING_PAYMENT", "PENDING", new Date(Date.now() + 60 * 60_000)) });
    const expiredRegistration = await db.publicTournamentRegistration.create({ data: registrationData(2, "PENDING_PAYMENT", "PENDING", new Date(Date.now() - 60_000)) });
    const reviewRegistration = await db.publicTournamentRegistration.create({ data: registrationData(3, "CANCELED", "REVIEW", new Date(Date.now() - 60_000)) });
    const pixRegistration = await db.publicTournamentRegistration.create({ data: {
      ...registrationData(4, "PENDING_PAYMENT", "PENDING", new Date(Date.now() + 60 * 60_000)),
      paymentCheckoutUrl: "", paymentQrCode: "PIX-GOAL-COPIA-E-COLA-1234567890",
    } });
    for (const viewport of viewports) {
      for (const [state, registration, expectedText, hasPayButton, hasPixCode] of [
        ["active", activeRegistration, "Sua vaga está aguardando pagamento", true, false],
        ["expired", expiredRegistration, "O prazo desta vaga terminou", false, false],
        ["review", reviewRegistration, "Estamos conferindo seu pagamento", false, false],
        ["pix", pixRegistration, "Sua vaga está aguardando pagamento", false, true],
      ]) {
        const body = await visit(`/inscricao/${publicTournament.publicSlug}/sucesso/${registration.id}`, viewport, arenaA.id, `${viewport.name}-public-registration-${state}`);
        if (!body.includes(expectedText) || body.includes("Pagar agora") !== hasPayButton || body.includes("PIX-GOAL-COPIA-E-COLA-1234567890") !== hasPixCode) {
          throw new Error(`${viewport.name}: estado ${state} da inscrição pública não corresponde ao prazo ou à revisão.`);
        }
        if (["active", "pix"].includes(state) && (!body.includes("Tempo restante para pagar:") || !body.includes("Atualizar situação"))) {
          throw new Error(`${viewport.name}: inscrição ${state} sem prazo visível ou atualização manual do status.`);
        }
        if (state === "pix" && !body.includes("Copiar código Pix")) {
          throw new Error(`${viewport.name}: inscrição Pix sem ação de copiar o código.`);
        }
        const summary = await send("Runtime.evaluate", {
          expression: "(() => { const grid = document.querySelector('.public-reg-success-summary'); const cells = [...(grid?.children ?? [])]; const badge = grid?.querySelector('strong[class*=status-]'); return { badgeColor: badge ? getComputedStyle(badge).color : null, gridWidth: grid?.getBoundingClientRect().width ?? 0, lastWidth: cells.at(-1)?.getBoundingClientRect().width ?? 0, overflow: document.documentElement.scrollWidth - window.innerWidth }; })()",
          returnByValue: true,
        });
        const layout = summary.result.value;
        if (!layout.badgeColor || layout.badgeColor === "rgb(255, 255, 255)" || layout.overflow > 2 || (viewport.name === "desktop" && layout.gridWidth - layout.lastWidth > 4)) {
          throw new Error(`${viewport.name}: etiqueta ilegível ou última célula vazia na inscrição ${state}: ${JSON.stringify(layout)}`);
        }
      }
    }
    console.log("Inscrições públicas ativa, expirada, em revisão e Pix sem link renderizadas no desktop e celular.");
    const expiringRegistration = await db.publicTournamentRegistration.create({ data: registrationData(5, "PENDING_PAYMENT", "PENDING", new Date(Date.now() + 25_000)) });
    const expiringPath = `/inscricao/${publicTournament.publicSlug}/sucesso/${expiringRegistration.id}`;
    const beforeExpiry = await visit(expiringPath, viewports[0], arenaA.id, "desktop-public-registration-expiring");
    if (!beforeExpiry.includes("Pagar agora") || !beforeExpiry.includes("Tempo restante para pagar:")) {
      throw new Error("A inscrição prestes a expirar não mostrou cobrança e tempo restante antes do prazo.");
    }
    await pause(25_000);
    let afterExpiry;
    for (let attempt = 0; attempt < 15; attempt += 1) {
      afterExpiry = await send("Runtime.evaluate", {
        expression: "({body:document.body.innerText,payVisible:[...document.querySelectorAll('a')].some(link=>link.textContent?.trim()==='Pagar agora'),status:document.querySelector('.public-reg-success-summary strong[class*=status-]')?.textContent?.trim() ?? ''})",
        returnByValue: true,
      });
      if (afterExpiry.result.value.status === "Prazo encerrado") break;
      await pause(300);
    }
    if (afterExpiry.result.value.payVisible || !afterExpiry.result.value.body.includes("O prazo desta vaga terminou") || afterExpiry.result.value.status !== "Prazo encerrado") {
      throw new Error(`A inscrição aberta não atualizou o estado após vencer: ${JSON.stringify({ payVisible: afterExpiry.result.value.payVisible, status: afterExpiry.result.value.status })}`);
    }
    console.log("Inscrição aberta no navegador expirou sem manter link de pagamento ou status pendente.");

    const ranking = await db.rankingProfile.create({ data: {
      arenaId: arenaA.id, name: "Ranking GOAL Visual", type: "PAIR", model: "LEAGUE",
      rules: { create: { stageKey: "WIN", label: "Vitória", points: 1, displayOrder: 1 } },
      cycles: { create: { label: "Ciclo GOAL" } },
    } });
    for (const viewport of viewports) {
      for (const tab of ["configuracao", "pontuacao", "classificacao", "uso"]) {
        const body = await visit(`/torneios/rankings/${ranking.id}?tab=${tab}`, viewport, arenaA.id, `${viewport.name}-ranking-${tab}`);
        if (!body.includes("Ranking GOAL Visual")) throw new Error(`${viewport.name}: detalhe do ranking ${tab} não exibiu o ranking fictício.`);
        if (tab === "configuracao") {
          const insets = await send("Runtime.evaluate", { expression: "(() => { const period=document.querySelector('.ranking-detail-period'); const form=document.querySelector('.ranking-configuration-form'); const heading=form?.querySelector('.ranking-configuration-heading'); return {period:period?.firstElementChild ? period.firstElementChild.getBoundingClientRect().left-period.getBoundingClientRect().left : -1,form:heading ? heading.getBoundingClientRect().left-form.getBoundingClientRect().left : -1}; })()", returnByValue: true });
          if (insets.result.value.period < 20 || insets.result.value.form < 20) throw new Error(`${viewport.name}: conteúdo do ranking colado à borda dos cards: ${JSON.stringify(insets.result.value)}`);
        }
      }
    }

    const league = await db.tournament.findFirstOrThrow({
      where: { arenaId: arenaA.id, name: "Liga GOAL" },
      select: {
        id: true,
        categories: {
          select: {
            id: true,
            competition: {
              select: {
                id: true,
                leagueCycles: { select: { id: true, status: true } },
              },
            },
          },
        },
      },
    });
    const category = league.categories[0];
    const competition = category.competition;
    const openCycle = competition.leagueCycles.find((cycle) => cycle.status === "OPEN");
    if (!openCycle) throw new Error("Ciclo fictício aberto não encontrado.");
    const categoryPath = `/torneios/${league.id}/categorias/${category.id}`;
    await send("Network.clearBrowserCookies");
    for (const viewport of viewports) {
      for (const [section, path] of [
        ["detalhe", `/torneios/${league.id}`],
        ["categorias", `/torneios/${league.id}/categorias`],
        ["inscricoes", `/torneios/${league.id}/inscricoes`],
        ["jogos", `/torneios/${league.id}/jogos`],
        ["liga", categoryPath],
      ]) {
        await visit(path, viewport, arenaA.id, `${viewport.name}-torneio-${section}`);
        if (section === "detalhe") {
          const controls = await send("Runtime.evaluate", { expression: "[...document.querySelectorAll('.event-operation-actions .button')].map(button => ({text:button.textContent?.trim(),height:button.getBoundingClientRect().height,right:button.getBoundingClientRect().right,scrollWidth:button.scrollWidth,clientWidth:button.clientWidth}))", returnByValue: true });
          if (controls.result.value.length < 4 || controls.result.value.some(button => button.height > 48 || button.right > viewport.width + 1 || button.scrollWidth > button.clientWidth + 1)) {
            throw new Error(`${viewport.name}: ações do torneio estão quebradas ou comprimidas: ${JSON.stringify(controls.result.value)}`);
          }
          if (viewport.name === "desktop") {
            const title = await send("Runtime.evaluate", { expression: "(() => { const heading=document.querySelector('.event-operation-title h1'); const range=document.createRange(); range.selectNodeContents(heading); return {lines:range.getClientRects().length,width:heading.getBoundingClientRect().width}; })()", returnByValue: true });
            if (title.result.value.lines !== 1) throw new Error(`O título curto do torneio quebrou por falta de espaço no cabeçalho desktop: ${JSON.stringify(title.result.value)}`);
          }
        }
      }
    }
    await visit(categoryPath, viewports[0], arenaA.id, "liga-ciclo-antes");
    await send("Runtime.evaluate", { expression: "[...document.querySelectorAll('button')].find(button => button.textContent?.includes('Processar ciclo da Liga'))?.click()" });
    let confirmation;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const response = await send("Runtime.evaluate", { expression: "({dialog:document.querySelector('[role=dialog]')?.innerText ?? '',input:Boolean(document.querySelector('[role=dialog] input[name=confirmKeyword]'))})", returnByValue: true });
      confirmation = response.result.value;
      if (confirmation.input) break;
      await pause(200);
    }
    if (!confirmation?.input || !confirmation.dialog.includes("PROCESSAR")) throw new Error("Confirmação do processamento da Liga não abriu.");
    await send("Runtime.evaluate", { expression: "document.querySelector('[role=dialog] input[name=confirmKeyword]')?.focus()" });
    await send("Input.insertText", { text: "PROCESSAR" });
    await clickElement('[role=dialog] button[type=submit]');
    let processed = false;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const cycle = await db.leagueCycle.findUniqueOrThrow({ where: { id: openCycle.id }, select: { status: true, championPairId: true } });
      const feedback = await send("Runtime.evaluate", { expression: "document.body?.innerText ?? ''", returnByValue: true });
      if (cycle.status === "CLOSED" && feedback.result.value.includes("Ciclo da Liga processado com sucesso")) { processed = true; break; }
      if (/Algo saiu do fluxo|Não foi possível processar/.test(feedback.result.value)) throw new Error(`Processamento pela tela falhou: ${feedback.result.value.slice(-700)}`);
      await pause(300);
    }
    if (!processed) throw new Error("A Liga não fechou ou não exibiu confirmação de sucesso.");
    console.log("Ciclo fictício processado pela interface com confirmação de sucesso.");
    for (const viewport of viewports) {
      await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.name === "mobile" });
      await selectArena(arenaA.id);
      await send("Page.navigate", { url: `${baseUrl}${categoryPath}?tab=history` });
      let history;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const response = await send("Runtime.evaluate", { expression: "({body:document.body?.innerText ?? '',button:Boolean(document.querySelector('button[aria-label^=\"Ver histórico de\"]')),width:innerWidth,scrollWidth:document.documentElement.scrollWidth})", returnByValue: true });
        history = response.result?.value;
        if (history?.button) break;
        await pause(200);
      }
      if (!history?.button || history.scrollWidth > history.width + 1) throw new Error(`${viewport.name}: histórico da Liga ausente ou com overflow.`);
      await clickElement('button[aria-label^="Ver histórico de"]');
      const detail = await send("Runtime.evaluate", { expression: "({dialog:document.querySelector('[role=dialog]')?.innerText ?? '',width:innerWidth,scrollWidth:document.documentElement.scrollWidth})", returnByValue: true });
      if (!detail.result.value.dialog.includes("Campeã") || !detail.result.value.dialog.includes("Parceira de Nome Comprido GOAL") || !detail.result.value.dialog.includes("Saldo") || detail.result.value.scrollWidth > detail.result.value.width + 1) {
        throw new Error(`${viewport.name}: modal do histórico não mostrou campeã e classificação sem overflow.`);
      }
      await waitForPageFade();
      const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
      await writeFile(`${outputDir}/liga-historico-${viewport.name}.png`, Buffer.from(shot.data, "base64"));
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      const closed = await send("Runtime.evaluate", { expression: "Boolean(document.querySelector('[role=dialog]'))", returnByValue: true });
      if (closed.result.value) throw new Error(`${viewport.name}: histórico não fechou com Esc.`);
      console.log(`${viewport.name}: histórico da Liga exibiu campeã, ranking e fechou com Esc.`);
    }

    const accountJid = "5599999000000@s.whatsapp.net";
    const syntheticPng = `data:image/png;base64,${(await sharp({ create: { width: 96, height: 64, channels: 3, background: { r: 27, g: 153, b: 145 } } }).png().toBuffer()).toString("base64")}`;
    await db.whatsAppConnection.create({ data: { arenaId: arenaA.id, instanceName: "goal-visual-whatsapp-a", status: "CONNECTED", connectedPhone: accountJid } });
    await db.whatsAppConnection.create({ data: { arenaId: arenaB.id, instanceName: "goal-visual-whatsapp-b", status: "CONNECTED", connectedPhone: "5588888000000@s.whatsapp.net" } });
    const conversation = await db.whatsAppConversation.create({ data: {
      arenaId: arenaA.id, accountJid, remoteJid: "5577777000000@s.whatsapp.net",
      contactName: "Contato atual GOAL", contactPhone: "5577777000000", unreadCount: 1,
    } });
    await db.whatsAppMessage.create({ data: { conversationId: conversation.id, providerId: "goal-initial", direction: "INBOUND", body: "Mensagem inicial GOAL" } });
    await db.whatsAppMessage.create({ data: { conversationId: conversation.id, providerId: "goal-outbound", direction: "OUTBOUND", senderName: "Equipe GOAL", body: "Resposta enviada GOAL" } });
    const imageMessage = await db.whatsAppMessage.create({ data: { conversationId: conversation.id, providerId: "goal-image", direction: "INBOUND", body: "Imagem", mediaType: "IMAGE", mediaMimeType: "image/png", mediaUrl: syntheticPng } });
    const audioMessage = await db.whatsAppMessage.create({ data: { conversationId: conversation.id, providerId: "goal-audio", direction: "INBOUND", body: "Áudio", mediaType: "AUDIO", mediaMimeType: "audio/wav", mediaUrl: testAudioDataUrl() } });
    await db.whatsAppConversation.create({ data: { arenaId: arenaA.id, accountJid: "5566666000000@s.whatsapp.net", remoteJid: "5555555000000@s.whatsapp.net", contactName: "Conversa antiga GOAL" } });
    await db.whatsAppConversation.create({ data: { arenaId: arenaB.id, accountJid: "5588888000000@s.whatsapp.net", remoteJid: "5544444000000@s.whatsapp.net", contactName: "Contato beta WhatsApp GOAL" } });
    const inboxBefore = await db.whatsAppConnection.findUniqueOrThrow({ where: { arenaId: arenaA.id }, select: { inboxRevision: true } });
    const desktopWhatsapp = await visit("/whatsapp", viewports[0], arenaA.id, "whatsapp-conversa-antes");
    if (!desktopWhatsapp.includes("Contato atual GOAL") || !desktopWhatsapp.includes("Mensagem inicial GOAL") || !desktopWhatsapp.includes("Resposta enviada GOAL") || desktopWhatsapp.includes("Conversa antiga GOAL") || desktopWhatsapp.includes("Contato beta WhatsApp GOAL")) {
      throw new Error("A caixa WhatsApp não respeitou a conta conectada e o isolamento entre arenas.");
    }
    let desktopDetails;
    for (let attempt = 0; attempt < 25; attempt += 1) {
      desktopDetails = await send("Runtime.evaluate", { expression: "({visible:!!document.querySelector('#whatsapp-contact-details')?.getClientRects().length,content:document.querySelector('#whatsapp-contact-details')?.innerText ?? '',width:document.documentElement.scrollWidth,viewport:innerWidth,composerWidth:document.querySelector('.whatsapp-chat-main .whatsapp-composer-field')?.getBoundingClientRect().width ?? 0,profileOverflow:(document.querySelector('#whatsapp-contact-details')?.scrollWidth ?? 0)-(document.querySelector('#whatsapp-contact-details')?.clientWidth ?? 0)})", returnByValue: true });
      if (desktopDetails.result.value.visible) break;
      await pause(200);
    }
    if (!desktopDetails.result.value.visible || !desktopDetails.result.value.content.includes("Contato atual GOAL") || !desktopDetails.result.value.content.includes("Não vinculado") || desktopDetails.result.value.width > desktopDetails.result.value.viewport + 1 || desktopDetails.result.value.composerWidth < 240 || desktopDetails.result.value.profileOverflow > 1) {
      throw new Error(`O perfil do contato não abriu ao lado da conversa no desktop: ${JSON.stringify(desktopDetails.result.value)}`);
    }
    for (const [messageId, mimeType] of [[imageMessage.id, "image/png"], [audioMessage.id, "audio/wav"]]) {
      const response = await fetch(`${baseUrl}/api/whatsapp/media/${messageId}`, { headers: { Cookie: cookie(arenaA.id) }, signal: AbortSignal.timeout(20_000) });
      if (response.status !== 200 || !response.headers.get("content-type")?.includes(mimeType) || !(await response.arrayBuffer()).byteLength) {
        throw new Error(`Mídia fictícia do WhatsApp não carregou: ${messageId} (${response.status}).`);
      }
      const isolated = await fetch(`${baseUrl}/api/whatsapp/media/${messageId}`, { headers: { Cookie: cookie(arenaB.id) }, signal: AbortSignal.timeout(20_000) });
      if (isolated.status !== 404) throw new Error("Mídia do WhatsApp ficou acessível para outra arena.");
      await isolated.body?.cancel();
    }
    let desktopMedia;
    for (let attempt = 0; attempt < 25; attempt += 1) {
      desktopMedia = await send("Runtime.evaluate", { expression: "({image:document.querySelector('.whatsapp-chat-main .whatsapp-message-image')?.naturalWidth ?? 0,audio:document.querySelector('.whatsapp-chat-main audio[controls]')?.duration ?? 0,composer:!!document.querySelector('.whatsapp-chat-main textarea[aria-label=\"Mensagem ou legenda\"]')})", returnByValue: true });
      if (desktopMedia.result.value.image && desktopMedia.result.value.audio > 0 && desktopMedia.result.value.composer) break;
      await pause(200);
    }
    if (!desktopMedia.result.value.image || !(desktopMedia.result.value.audio > 0) || !desktopMedia.result.value.composer) throw new Error(`Imagem, áudio ou compositor ausente no chat desktop: ${JSON.stringify(desktopMedia.result.value)}`);
    const loadedDesktopShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
    await writeFile(`${outputDir}/whatsapp-conversa-desktop-carregada.png`, Buffer.from(loadedDesktopShot.data, "base64"));
    await send("Runtime.evaluate", { expression: "document.querySelector('.whatsapp-chat-main .whatsapp-message-image')?.click()" });
    const imageDialog = await send("Runtime.evaluate", { expression: "!!document.querySelector('[role=dialog][aria-label=\"Imagem ampliada\"]')", returnByValue: true });
    if (!imageDialog.result.value) throw new Error("A imagem do WhatsApp não abriu ampliada.");
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    const imageClosed = await send("Runtime.evaluate", { expression: "!document.querySelector('[role=dialog][aria-label=\"Imagem ampliada\"]')", returnByValue: true });
    if (!imageClosed.result.value) throw new Error("A imagem ampliada não fechou com Esc.");
    await send("Runtime.evaluate", { expression: "window.__goalWhatsappPageStayedOpen = true" });
    await db.whatsAppMessage.create({ data: { conversationId: conversation.id, providerId: "goal-live", direction: "INBOUND", body: "Mensagem ao vivo GOAL" } });
    await db.whatsAppConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date(), unreadCount: 2 } });
    const inboxAfter = await db.whatsAppConnection.findUniqueOrThrow({ where: { arenaId: arenaA.id }, select: { inboxRevision: true } });
    if (inboxAfter.inboxRevision <= inboxBefore.inboxRevision) throw new Error("A revisão da caixa não avançou após a mensagem nova.");
    let receivedLive = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const response = await send("Runtime.evaluate", { expression: "({open:window.__goalWhatsappPageStayedOpen === true,chat:[...document.querySelectorAll('main')].at(-1)?.innerText ?? ''})", returnByValue: true });
      if (response.result.value.open && response.result.value.chat.includes("Mensagem ao vivo GOAL")) { receivedLive = true; break; }
      await pause(300);
    }
    if (!receivedLive) throw new Error("A mensagem nova do WhatsApp não surgiu sem recarregar a página.");
    console.log("WhatsApp: mensagem fictícia recebida na conversa aberta sem recarga, com conta e arena isoladas.");
    for (const mobileViewport of [viewports[1], { name: "mobile-320", width: 320, height: 700 }]) {
    const mobileWhatsapp = await visit("/whatsapp", mobileViewport, arenaA.id, `whatsapp-conversa-${mobileViewport.name}`);
    if (!mobileWhatsapp.includes("Contato atual GOAL") || mobileWhatsapp.includes("Conversa antiga GOAL") || mobileWhatsapp.includes("Contato beta WhatsApp GOAL")) {
      throw new Error("A lista mobile do WhatsApp misturou conversas de contas ou arenas.");
    }
    await send("Runtime.evaluate", { expression: "[...document.querySelectorAll('button')].find(button => button.textContent?.includes('Contato atual GOAL'))?.click()" });
    let mobileChat = "";
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const response = await send("Runtime.evaluate", { expression: "[...document.querySelectorAll('main')].at(-1)?.innerText ?? ''", returnByValue: true });
      mobileChat = response.result.value;
      if (mobileChat.includes("Mensagem ao vivo GOAL")) break;
      await pause(200);
    }
    if (!mobileChat.includes("Mensagem ao vivo GOAL")) throw new Error("A conversa mobile não mostrou a mensagem recebida.");
    let mobileMedia;
    for (let attempt = 0; attempt < 25; attempt += 1) {
      mobileMedia = await send("Runtime.evaluate", { expression: "({image:document.querySelector('.whatsapp-chat-main .whatsapp-message-image')?.naturalWidth ?? 0,audio:document.querySelector('.whatsapp-chat-main audio[controls]')?.duration ?? 0,composer:document.querySelector('.whatsapp-chat-main .whatsapp-composer')?.getBoundingClientRect().toJSON(),viewport:innerWidth})", returnByValue: true });
      if (mobileMedia.result.value.image && mobileMedia.result.value.audio > 0 && mobileMedia.result.value.composer) break;
      await pause(200);
    }
    if (!mobileMedia.result.value.image || !(mobileMedia.result.value.audio > 0) || !mobileMedia.result.value.composer || mobileMedia.result.value.composer.left < -1 || mobileMedia.result.value.composer.right > mobileMedia.result.value.viewport + 1) {
      throw new Error(`Mídias ou compositor cortados no chat mobile: ${JSON.stringify(mobileMedia.result.value)}`);
    }
    const composerControls = await send("Runtime.evaluate", {
      expression: "[...document.querySelector('.whatsapp-chat-main .whatsapp-composer')?.children ?? []].filter(element => (element.tagName === 'BUTTON' || element.classList.contains('whatsapp-composer-field')) && element.getClientRects().length).map(element => ({name:element.getAttribute('aria-label') || element.className,rect:element.getBoundingClientRect().toJSON()}))",
      returnByValue: true,
    });
    const controls = composerControls.result.value;
    if (controls.length < 5 || controls.some(({ rect }) => rect.left < -1 || rect.right > mobileViewport.width + 1 || rect.width < 28) || controls.some((item, index) => controls.slice(index + 1).some((other) => item.rect.left < other.rect.right - 1 && item.rect.right > other.rect.left + 1 && item.rect.top < other.rect.bottom - 1 && item.rect.bottom > other.rect.top + 1))) {
      throw new Error(`${mobileViewport.name}: controles do compositor sobrepostos ou cortados: ${JSON.stringify(controls)}`);
    }
    const chatLayout = await send("Runtime.evaluate", {
      expression: "({width:document.querySelector('.whatsapp-chat-main')?.getBoundingClientRect().width ?? 0, viewport:innerWidth, detailsButtonVisible:!!document.querySelector('.whatsapp-chat-main button[aria-label=\"Detalhes do contato\"]')?.getClientRects().length})",
      returnByValue: true,
    });
    if (chatLayout.result.value.width < chatLayout.result.value.viewport - 50 || !chatLayout.result.value.detailsButtonVisible) {
      throw new Error("O chat mobile não ocupou a largura disponível ou perdeu o acesso aos detalhes do contato.");
    }
    const headerLayout = await send("Runtime.evaluate", {
      expression: "(() => { const header=document.querySelector('.whatsapp-chat-main > header'); const details=header?.querySelector('button[aria-label=\"Detalhes do contato\"]')?.getBoundingClientRect(); const text=header?.querySelector('div > span'); return {details:details?.toJSON(),text:text?.getBoundingClientRect().toJSON(),nameOverflow:(text?.querySelector('strong')?.scrollWidth ?? 0)-(text?.querySelector('strong')?.clientWidth ?? 0),phoneOverflow:(text?.querySelector('small')?.scrollWidth ?? 0)-(text?.querySelector('small')?.clientWidth ?? 0)}; })()",
      returnByValue: true,
    });
    if (!headerLayout.result.value.details || !headerLayout.result.value.text || headerLayout.result.value.text.right > headerLayout.result.value.details.left - 2 || headerLayout.result.value.nameOverflow > 1 || headerLayout.result.value.phoneOverflow > 1) {
      throw new Error(`${mobileViewport.name}: nome ou telefone encoberto pelo botão do contato: ${JSON.stringify(headerLayout.result.value)}`);
    }
    await send("Runtime.evaluate", { expression: "document.querySelector('.whatsapp-chat-main button[aria-label=\"Detalhes do contato\"]')?.click()" });
    await pause(200);
    const detailsOpen = await send("Runtime.evaluate", { expression: "!!document.querySelector('#whatsapp-contact-details')", returnByValue: true });
    if (!detailsOpen.result.value) throw new Error("Os detalhes do contato não abriram no chat mobile.");
    const detailsLayout = await send("Runtime.evaluate", {
      expression: "({panel:document.querySelector('#whatsapp-contact-details')?.getBoundingClientRect().toJSON(), workspace:document.querySelector('.whatsapp-chat-workspace')?.getBoundingClientRect().toJSON()})",
      returnByValue: true,
    });
    if (detailsLayout.result.value.panel?.width < detailsLayout.result.value.workspace?.width - 2 || Math.abs(detailsLayout.result.value.panel?.right - detailsLayout.result.value.workspace?.right) > 2) {
      throw new Error(`Os detalhes do contato não ocuparam corretamente a largura do chat mobile: ${JSON.stringify(detailsLayout.result.value)}`);
    }
    await send("Runtime.evaluate", { expression: "document.querySelector('#whatsapp-contact-details button[aria-label=\"Fechar detalhes do contato\"]')?.click()" });
    await pause(100);
    const whatsappMobileShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
    await writeFile(`${outputDir}/whatsapp-conversa-${mobileViewport.name}-aberta.png`, Buffer.from(whatsappMobileShot.data, "base64"));
    }

    await visit("/whatsapp", viewports[0], arenaA.id, "whatsapp-conversa-limpeza");
    await send("Runtime.evaluate", { expression: "document.querySelector('button[aria-label=\"Ações da conversa\"]')?.click()" });
    let clearOptionClicked = false;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const clearOption = await send("Runtime.evaluate", { expression: "(() => { const option = [...document.querySelectorAll('button')].find(button => button.textContent?.includes('Limpar conversa')); if (!option) return false; option.click(); return true; })()", returnByValue: true });
      if (clearOption.result.value) { clearOptionClicked = true; break; }
      await pause(100);
    }
    if (!clearOptionClicked) throw new Error("A opção de limpar conversa não pôde ser acionada.");
    let clearedOnScreen = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const state = await send("Runtime.evaluate", { expression: "({notice:document.body.innerText.includes('Mensagens removidas da conversa.'),history:document.querySelector('.whatsapp-message-thread')?.innerText ?? ''})", returnByValue: true });
      if (state.result.value.notice && !state.result.value.history.includes("Mensagem inicial GOAL") && !state.result.value.history.includes("Resposta enviada GOAL")) { clearedOnScreen = true; break; }
      await pause(200);
    }
    const clearedConversation = await db.whatsAppConversation.findUniqueOrThrow({ where: { id: conversation.id }, select: { unreadCount: true, slaResolvedAt: true } });
    if (!clearedOnScreen || clearedConversation.unreadCount !== 0 || !clearedConversation.slaResolvedAt || await db.whatsAppMessage.count({ where: { conversationId: conversation.id } }) !== 0) {
      throw new Error("Limpar conversa não removeu o histórico aberto ou não encerrou o alerta de SLA.");
    }
    console.log("WhatsApp: limpeza da conversa aberta removeu mensagens e zerou não lidas e SLA.");

    const [teacherA, teacherB] = await Promise.all([
      db.teacher.create({ data: { arenaId: arenaA.id, name: "Professora Financeiro GOAL A" } }),
      db.teacher.create({ data: { arenaId: arenaA.id, name: "Professor Financeiro GOAL B" } }),
    ]);
    const [planA1, planA2, planB] = await Promise.all([
      db.plan.create({ data: { arenaId: arenaA.id, name: "Plano Financeiro GOAL A1", monthlyPriceCents: 10000 } }),
      db.plan.create({ data: { arenaId: arenaA.id, name: "Plano Financeiro GOAL A2", monthlyPriceCents: 12000 } }),
      db.plan.create({ data: { arenaId: arenaA.id, name: "Plano Financeiro GOAL B", monthlyPriceCents: 14000 } }),
    ]);
    const sharedPlan = await db.plan.create({ data: { arenaId: arenaA.id, name: "Plano Financeiro GOAL Compartilhado", monthlyPriceCents: 16000 } });
    await db.teacherPlan.createMany({ data: [
      { arenaId: arenaA.id, teacherId: teacherA.id, planId: planA1.id, monthlyPriceCents: 10000 },
      { arenaId: arenaA.id, teacherId: teacherA.id, planId: planA2.id, monthlyPriceCents: 12000 },
      { arenaId: arenaA.id, teacherId: teacherB.id, planId: planB.id, monthlyPriceCents: 14000 },
      { arenaId: arenaA.id, teacherId: teacherA.id, planId: sharedPlan.id, monthlyPriceCents: 16000 },
      { arenaId: arenaA.id, teacherId: teacherB.id, planId: sharedPlan.id, monthlyPriceCents: 16000 },
    ] });
    for (const viewport of viewports) {
      await visit(`/professores/${teacherA.id}`, viewport, arenaA.id, `${viewport.name}-professor-detalhe`);
    }
    await db.financialEntry.createMany({ data: [
      { arenaId: arenaA.id, type: "REVENUE", category: "Planos de aulas", description: "Mensalidade GOAL A1", amountCents: 10000, planId: planA1.id, teacherId: teacherA.id },
      { arenaId: arenaA.id, type: "REVENUE", category: "Plano de Aulas", description: "Mensalidade GOAL A2", amountCents: 12000, planId: planA2.id, teacherId: teacherA.id },
      { arenaId: arenaA.id, type: "REVENUE", category: "Planos de aulas", description: "Mensalidade GOAL B", amountCents: 14000, planId: planB.id, teacherId: teacherB.id },
      { arenaId: arenaA.id, type: "REVENUE", category: "Planos de aulas", description: "Mensalidade GOAL compartilhada A", amountCents: 16000, planId: sharedPlan.id, teacherId: teacherA.id },
      { arenaId: arenaA.id, type: "REVENUE", category: "Planos de aulas", description: "Mensalidade GOAL compartilhada B", amountCents: 16000, planId: sharedPlan.id, teacherId: teacherB.id },
      { arenaId: arenaA.id, type: "REVENUE", category: "Venda", description: "Venda GOAL filtrada", amountCents: 2500 },
      { arenaId: arenaB.id, type: "REVENUE", category: "Venda", description: "Venda sigilosa GOAL B", amountCents: 9999 },
    ] });
    const receivables = await visit("/financeiro/contas-a-receber", viewports[0], arenaA.id, "recebiveis-filtros-antes");
    if (!["Mensalidade GOAL A1", "Mensalidade GOAL A2", "Mensalidade GOAL B", "Mensalidade GOAL compartilhada A", "Mensalidade GOAL compartilhada B", "Venda GOAL filtrada"].every((label) => receivables.includes(label)) || receivables.includes("Venda sigilosa GOAL B")) {
      throw new Error("Contas a receber não exibiu os lançamentos próprios com isolamento entre arenas.");
    }
    const teacherOption = await send("Runtime.evaluate", { expression: `(() => { const select = document.querySelector('select[name="planId"]'); const value = 'teacher:${teacherA.id}'; if (!select || ![...select.options].some(option => option.value === value)) return false; select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`, returnByValue: true });
    if (!teacherOption.result.value) throw new Error("A opção Todos os planos da professora fictícia não apareceu.");
    let teacherFiltered = false;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const response = await send("Runtime.evaluate", { expression: "({search:location.search,body:document.querySelector('main')?.innerText ?? ''})", returnByValue: true });
      const { search, body } = response.result.value ?? {};
      if (body === undefined) { await pause(250); continue; }
      if (new URLSearchParams(search).get("planId") === `teacher:${teacherA.id}` && body.includes("Mensalidade GOAL A1") && body.includes("Mensalidade GOAL A2") && body.includes("Mensalidade GOAL compartilhada A") && !body.includes("Mensalidade GOAL B") && !body.includes("Mensalidade GOAL compartilhada B")) { teacherFiltered = true; break; }
      await pause(250);
    }
    if (!teacherFiltered) throw new Error("Todos os planos do professor não isolou os dois planos fictícios.");
    console.log("Financeiro: Todos os planos isolou a professora inclusive em um modelo compartilhado.");
    await send("Page.navigate", { url: `${baseUrl}/financeiro/contas-a-receber?category=Plano%20de%20Aulas` });
    let plansFiltered = false;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const response = await send("Runtime.evaluate", { expression: "({search:location.search,body:document.querySelector('main')?.innerText ?? ''})", returnByValue: true });
      const { search, body } = response.result.value ?? {};
      if (body === undefined) { await pause(250); continue; }
      if (new URLSearchParams(search).get("category") === "Plano de Aulas" && body.includes("Mensalidade GOAL A1") && body.includes("Mensalidade GOAL A2") && body.includes("Mensalidade GOAL B") && body.includes("Mensalidade GOAL compartilhada A") && body.includes("Mensalidade GOAL compartilhada B") && !body.includes("Venda GOAL filtrada")) { plansFiltered = true; break; }
      await pause(250);
    }
    if (!plansFiltered) throw new Error("Classificação Plano de Aulas não encontrou todas as mensalidades sem incluir vendas.");
    await send("Page.navigate", { url: `${baseUrl}/financeiro/contas-a-receber?category=Vendas` });
    let salesFiltered = false;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const response = await send("Runtime.evaluate", { expression: "({search:location.search,body:document.querySelector('main')?.innerText ?? '',width:innerWidth,scrollWidth:document.documentElement.scrollWidth})", returnByValue: true });
      const { search, body, width, scrollWidth } = response.result.value ?? {};
      if (body === undefined) { await pause(250); continue; }
      if (new URLSearchParams(search).get("category") === "Vendas" && body.includes("Venda GOAL filtrada") && !body.includes("Mensalidade GOAL A1") && !body.includes("Venda sigilosa GOAL B") && scrollWidth <= width + 1) { salesFiltered = true; break; }
      await pause(250);
    }
    if (!salesFiltered) throw new Error("Classificação Vendas incluiu mensalidades, outra arena ou apresentou overflow.");
    await waitForPageFade();
    const salesShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
    await writeFile(`${outputDir}/recebiveis-vendas-desktop.png`, Buffer.from(salesShot.data, "base64"));
    await send("Emulation.setDeviceMetricsOverride", { width: viewports[1].width, height: viewports[1].height, deviceScaleFactor: 1, mobile: true });
    await send("Page.navigate", { url: `${baseUrl}/financeiro/contas-a-receber?category=Vendas` });
    let mobileSales = false;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const response = await send("Runtime.evaluate", { expression: "({body:document.querySelector('main')?.innerText ?? '',width:innerWidth,scrollWidth:document.documentElement.scrollWidth})", returnByValue: true });
      const { body, width, scrollWidth } = response.result.value ?? {};
      if (body === undefined) { await pause(250); continue; }
      if (body.includes("Venda GOAL filtrada") && !body.includes("Venda sigilosa GOAL B") && scrollWidth <= width + 1) { mobileSales = true; break; }
      await pause(250);
    }
    if (!mobileSales) throw new Error("A lista filtrada de vendas falhou no celular.");
    await waitForPageFade();
    const mobileSalesShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
    await writeFile(`${outputDir}/recebiveis-vendas-mobile.png`, Buffer.from(mobileSalesShot.data, "base64"));
    console.log("Financeiro: classificações de Planos e Vendas validadas em contas a receber, desktop e celular.");

    const agencyPlan = await db.agencyPlan.create({ data: { name: "Plano de conciliação GOAL", monthlyPriceCents: 14900 } });
    let agencySubscription;
    let agencyEntry;
    let agencyInvoice;
    try {
      agencySubscription = await db.agencySubscription.create({ data: { arenaId: arenaA.id, planId: agencyPlan.id, nextDueAt: new Date("2035-11-10T12:00:00Z"), billingDay: 10 } });
      agencyEntry = await db.financialEntry.create({ data: { arenaId: arenaA.id, type: "EXPENSE", category: "Assinatura do sistema", description: "Assinatura GOAL em conciliação", amountCents: 14900, status: "PAID", source: "AGENCY_SUBSCRIPTION" } });
      agencyInvoice = await db.agencyInvoice.create({ data: { subscriptionId: agencySubscription.id, arenaId: arenaA.id, period: "2035-10", amountCents: 14900, dueAt: new Date("2035-10-10T12:00:00Z"), status: "PAID", financialEntryId: agencyEntry.id, providerPaymentId: "goal-review-payment", paymentReviewStatus: "refunded", paymentReviewAt: new Date() } });
      for (const viewport of viewports) {
        const plans = await visit("/agencia/planos", viewport, arenaA.id, `${viewport.name}-agencia-revisao-planos`);
        if (!plans.includes("Conciliação pendente") || !plans.includes("Reembolso informado")) throw new Error(`${viewport.name}: a fatura em revisão não apareceu na visão da agência.`);
        await send("Runtime.evaluate", { expression: "document.querySelector('.agency-invoice-row')?.scrollIntoView({ block: 'center' })" });
        await pause(180);
        const row = await send("Runtime.evaluate", { expression: "(() => { const el = document.querySelector('.agency-invoice-row'); if (!el) return null; const rect = el.getBoundingClientRect(); return { visible: rect.top < innerHeight && rect.bottom > 0, overflow: el.scrollWidth > el.clientWidth + 1, width: innerWidth, scrollWidth: document.documentElement.scrollWidth }; })()", returnByValue: true });
        if (!row.result.value?.visible || row.result.value.overflow || row.result.value.scrollWidth > row.result.value.width + 1) throw new Error(`${viewport.name}: fatura em revisão ficou cortada: ${JSON.stringify(row.result.value)}`);
        const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
        await writeFile(`${outputDir}/${viewport.name}-agencia-revisao-fatura.png`, Buffer.from(shot.data, "base64"));
        const finance = await visit("/agencia/financeiro", viewport, arenaA.id, `${viewport.name}-agencia-revisao-financeiro`);
        if (!finance.includes("149,00 em faturas com estorno ou contestação informada")) throw new Error(`${viewport.name}: o financeiro da agência não destacou a fatura em revisão.`);
      }
    } finally {
      if (agencyInvoice) await db.agencyInvoice.delete({ where: { id: agencyInvoice.id } });
      if (agencyEntry) await db.financialEntry.delete({ where: { id: agencyEntry.id } });
      if (agencySubscription) await db.agencySubscription.delete({ where: { id: agencySubscription.id } });
      await db.agencyPlan.delete({ where: { id: agencyPlan.id } });
    }

    for (const viewport of viewports) {
      const label = `${viewport.name}-calendario-modal-erro`;
      await visit(`/calendario?periodo=day&data=${futureAgendaDate}`, viewport, arenaA.id, label);
      await send("Runtime.evaluate", { expression: "document.querySelector('[data-calendar-create]')?.click()" });
      await pause(200);
      await send("Runtime.evaluate", { expression: "document.querySelector('[role=dialog][aria-label=\"Criar evento na agenda\"] input[name=title]')?.focus()" });
      await send("Input.insertText", { text: "X" });
      await send("Runtime.evaluate", { expression: "document.querySelector('[role=dialog][aria-label=\"Criar evento na agenda\"] form')?.requestSubmit()" });
      let errorState;
      for (let attempt = 0; attempt < 35; attempt += 1) {
        const result = await send("Runtime.evaluate", { expression: "(() => { const modal = document.querySelector('[role=dialog][aria-label=\"Criar evento na agenda\"]'); const rect = modal?.getBoundingClientRect(); return { open: Boolean(modal), error: modal?.querySelector('[role=alert]')?.textContent?.trim() ?? '', title: modal?.querySelector('input[name=title]')?.value ?? '', overflow: Boolean(modal && modal.scrollWidth > modal.clientWidth + 1), left: rect?.left, right: rect?.right, bottom: rect?.bottom, width: innerWidth, height: innerHeight }; })()", returnByValue: true });
        errorState = result.result.value;
        if (errorState?.error) break;
        await pause(200);
      }
      if (!errorState?.open || !errorState.error.includes("Informe um título com pelo menos 2 caracteres.") || errorState.title !== "X" || errorState.overflow || errorState.left < -1 || errorState.right > errorState.width + 1 || errorState.bottom > errorState.height + 1) {
        throw new Error(`${label}: erro de gravação fechou ou cortou o modal: ${JSON.stringify(errorState)}`);
      }
      const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
      await writeFile(`${outputDir}/${label}-aberto.png`, Buffer.from(shot.data, "base64"));
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await pause(120);
      const afterEscape = await send("Runtime.evaluate", { expression: "Boolean(document.querySelector('[role=dialog][aria-label=\"Criar evento na agenda\"]'))", returnByValue: true });
      if (afterEscape.result.value) throw new Error(`${label}: Esc não fechou o modal.`);
      await send("Runtime.evaluate", { expression: "document.querySelector('[data-calendar-create]')?.click()" });
      await pause(120);
      await send("Runtime.evaluate", { expression: "document.querySelector('.calendar-create-overlay')?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))" });
      await pause(120);
      const afterBackdrop = await send("Runtime.evaluate", { expression: "Boolean(document.querySelector('[role=dialog][aria-label=\"Criar evento na agenda\"]'))", returnByValue: true });
      if (afterBackdrop.result.value) throw new Error(`${label}: clique fora não fechou o modal.`);
      const createdTitle = `Evento criado GOAL ${viewport.name}`;
      try {
        await send("Runtime.evaluate", { expression: "document.querySelector('[data-calendar-create]')?.click()" });
        await pause(120);
        await send("Runtime.evaluate", { expression: "document.querySelector('[role=dialog][aria-label=\"Criar evento na agenda\"] input[name=title]')?.focus()" });
        await send("Input.insertText", { text: createdTitle });
        await send("Runtime.evaluate", { expression: "document.querySelector('[role=dialog][aria-label=\"Criar evento na agenda\"] form')?.requestSubmit()" });
        let saved = false;
        for (let attempt = 0; attempt < 35; attempt += 1) {
          const stored = await db.calendarEvent.count({ where: { arenaId: arenaA.id, title: createdTitle } });
          const dialog = await send("Runtime.evaluate", { expression: "Boolean(document.querySelector('[role=dialog][aria-label=\"Criar evento na agenda\"]'))", returnByValue: true });
          if (stored === 1 && !dialog.result.value) { saved = true; break; }
          await pause(200);
        }
        if (!saved) throw new Error(`${label}: gravação válida não criou o evento ou não fechou o modal.`);
      } finally {
        await db.calendarEvent.deleteMany({ where: { arenaId: arenaA.id, title: createdTitle } });
      }
    }
    console.log("Calendário: erro preserva o modal, sucesso fecha após gravar; Esc e clique fora funcionam em desktop e celular.");

    const restrictedToken = createHash("sha256").update(`restricted:${sessionToken}`).digest("hex");
    const restrictedUser = await db.user.create({ data: { name: "Operador restrito GOAL", email: "goal-restricted@example.test", passwordHash: "test-only", systemRole: "VIEWER" } });
    await db.arenaMember.create({ data: { arenaId: arenaA.id, userId: restrictedUser.id, role: "STAFF", viewPermissions: ["calendar", "finance:receivable:view", "matches", "stock"], editPermissions: ["calendar:booking:create"] } });
    await db.session.create({ data: { userId: restrictedUser.id, token: createHash("sha256").update(restrictedToken).digest("hex"), expiresAt: new Date(Date.now() + 60 * 60_000) } });
    const restrictedCourt = await db.court.findFirstOrThrow({ where: { arenaId: arenaA.id, name: "Quadra GOAL Agenda" }, select: { id: true } });
    const restrictedStart = new Date(`${futureAgendaDate}T10:00:00.000Z`);
    const restrictedBooking = await db.scheduleOccurrence.create({ data: {
      arenaId: arenaA.id, sourceType: "BOOKING", status: "SCHEDULED", title: "Reserva restrita GOAL",
      startsAt: restrictedStart, endsAt: new Date(restrictedStart.getTime() + 60 * 60_000),
      occurrenceCourts: { create: [{ courtId: restrictedCourt.id }] },
    } });
    const restrictedCalendarEvent = await db.calendarEvent.create({ data: {
      arenaId: arenaA.id, eventType: "EVENTO", title: "Evento restrito GOAL",
      scheduledAt: restrictedStart, durationMinutes: 60,
    } });
    const restrictedPairNames = ["Dupla mandante com nome comprido GOAL", "Dupla visitante com nome comprido GOAL"];
    const restrictedPairs = [];
    for (const [index, name] of restrictedPairNames.entries()) {
      restrictedPairs.push(await db.categoryPair.create({ data: { competitionId: competition.id, name, drawOrder: index + 1 } }));
    }
    const restrictedMatch = await db.categoryMatch.create({ data: {
      competitionId: competition.id, label: "Jogo consulta GOAL", stage: "GROUP", roundOrder: 999,
      homePairId: restrictedPairs[0].id, awayPairId: restrictedPairs[1].id,
      homeScore: 2, awayScore: 0, homeSet1: 6, awaySet1: 2, homeSet2: 6, awaySet2: 3,
    } });
    try {
      const forbiddenNewProduct = await fetch(`${baseUrl}/pdv/novo`, { headers: { Cookie: cookie(arenaA.id, restrictedToken) }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
      await forbiddenNewProduct.body?.cancel();
      if (forbiddenNewProduct.status !== 404) throw new Error(`Perfil Estoque somente leitura abriu cadastro de produto (HTTP ${forbiddenNewProduct.status}).`);
      for (const viewport of adminViewports) {
        const stockBody = await visit("/pdv/estoque", viewport, arenaA.id, `${viewport.name}-estoque-somente-leitura`, restrictedToken);
        if (!stockBody.includes("Produto GOAL")) throw new Error(`${viewport.name}: estoque não exibiu produto fictício para perfil somente leitura.`);
        const stockControls = await send("Runtime.evaluate", { expression: "({create:document.body.innerText.includes('Novo Produto'),adjust:document.body.innerText.includes('Salvar ajuste'),balance:document.body.innerText.includes('Criar balanço'),view:[...document.querySelectorAll('a')].some((link)=>link.textContent?.trim()==='Ver' && link.getAttribute('href')?.startsWith('/pdv/')),width:innerWidth,scrollWidth:document.documentElement.scrollWidth})", returnByValue: true });
        if (stockControls.result.value?.create || stockControls.result.value?.adjust || stockControls.result.value?.balance || !stockControls.result.value?.view || stockControls.result.value?.scrollWidth > stockControls.result.value?.width + 1) throw new Error(`${viewport.name}: estoque somente leitura exibiu edição ou ficou cortado: ${JSON.stringify(stockControls.result.value)}`);
        const detailBody = await visit(`/pdv/${detailProduct.id}`, viewport, arenaA.id, `${viewport.name}-produto-somente-leitura`, restrictedToken);
        if (!detailBody.includes("Produto GOAL") || !detailBody.includes("Histórico de estoque")) throw new Error(`${viewport.name}: detalhe do produto não abriu em modo de consulta.`);
        const detailControls = await send("Runtime.evaluate", { expression: "({save:document.body.innerText.includes('Salvar alterações'),adjust:document.body.innerText.includes('Registrar ajuste'),width:innerWidth,scrollWidth:document.documentElement.scrollWidth})", returnByValue: true });
        if (detailControls.result.value?.save || detailControls.result.value?.adjust || detailControls.result.value?.scrollWidth > detailControls.result.value?.width + 1) throw new Error(`${viewport.name}: detalhe somente leitura exibiu ações ou ficou cortado: ${JSON.stringify(detailControls.result.value)}`);
        const detailShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
        await writeFile(`${outputDir}/${viewport.name}-produto-somente-leitura.png`, Buffer.from(detailShot.data, "base64"));
        await send("Runtime.evaluate", { expression: "[...document.querySelectorAll('button')].find((button)=>button.textContent?.trim()==='Ver histórico')?.click()" });
        await pause(150);
        const historyOpen = await send("Runtime.evaluate", { expression: "(() => { const dialog=document.querySelector('[role=dialog][aria-label=\"Histórico de estoque\"]'); const rect=dialog?.getBoundingClientRect(); return {open:Boolean(dialog),left:rect?.left,right:rect?.right,width:rect?.width,viewport:innerWidth}; })()", returnByValue: true });
        if (!historyOpen.result.value?.open || historyOpen.result.value.left < -1 || historyOpen.result.value.right > historyOpen.result.value.viewport + 1 || historyOpen.result.value.width > 522) throw new Error(`${viewport.name}: histórico de estoque não abriu em largura adequada: ${JSON.stringify(historyOpen.result.value)}`);
        const historyShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
        await writeFile(`${outputDir}/${viewport.name}-historico-estoque-somente-leitura.png`, Buffer.from(historyShot.data, "base64"));
        await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
        await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
        await pause(150);
        const historyClosed = await send("Runtime.evaluate", { expression: "!document.querySelector('[role=dialog][aria-label=\"Histórico de estoque\"]')", returnByValue: true });
        if (!historyClosed.result.value) throw new Error(`${viewport.name}: Esc não fechou o histórico de estoque.`);
        const servicesBody = await visit("/pdv/servicos", viewport, arenaA.id, `${viewport.name}-servicos-somente-leitura`, restrictedToken);
        if (!servicesBody.includes("Valores por atleta") || servicesBody.includes("Salvar valor")) throw new Error(`${viewport.name}: serviços não abriu em modo de consulta.`);
        const balanceBody = await visit("/pdv/balanco", viewport, arenaA.id, `${viewport.name}-balanco-somente-leitura`, restrictedToken);
        if (!balanceBody.includes("Relatório de divergências") || balanceBody.includes("Finalizar balanço")) throw new Error(`${viewport.name}: balanço expôs formulário a perfil somente leitura.`);
        const stockShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
        await writeFile(`${outputDir}/${viewport.name}-balanco-somente-leitura.png`, Buffer.from(stockShot.data, "base64"));
      }
      for (const path of [`/torneios/${league.id}`, `/torneios/${league.id}/categorias/${category.id}`]) {
        const denied = await fetch(`${baseUrl}${path}`, { headers: { Cookie: cookie(arenaA.id, restrictedToken) }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
        await denied.body?.cancel();
        if (denied.status !== 404) throw new Error(`Perfil Jogos recebeu HTTP ${denied.status} ao abrir gestão em ${path}; esperado 404.`);
      }
      const deniedWhatsapp = await fetch(`${baseUrl}/whatsapp`, { headers: { Cookie: cookie(arenaA.id, restrictedToken) }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
      await deniedWhatsapp.body?.cancel();
      if (deniedWhatsapp.status !== 404) throw new Error(`Perfil Jogos recebeu HTTP ${deniedWhatsapp.status} ao abrir conversas do WhatsApp; esperado 404.`);
      const restrictedHome = await fetch(`${baseUrl}/painel`, { headers: { Cookie: cookie(arenaA.id, restrictedToken) }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
      await restrictedHome.body?.cancel();
      if (![303, 307, 308].includes(restrictedHome.status) || !restrictedHome.headers.get("location")?.includes("/jogos")) {
        throw new Error(`Perfil Jogos recebeu Dashboard financeiro ou destino inválido (HTTP ${restrictedHome.status}).`);
      }
      for (const viewport of adminViewports) {
        const matchBody = await visit(`/torneios?tournamentId=${league.id}`, viewport, arenaA.id, `${viewport.name}-jogos-somente-leitura`, restrictedToken);
        if (!matchBody.includes("Jogo consulta GOAL") || !matchBody.includes("2 × 0") || !matchBody.includes("6–2 · 6–3") ||
            restrictedPairNames.some((name) => !matchBody.includes(name))) {
          throw new Error(`${viewport.name}: Jogos não exibiu as duplas e o placar para permissão somente leitura.`);
        }
        const matchLayout = await send("Runtime.evaluate", {
          expression: "(() => { const card=[...document.querySelectorAll('article')].find(item=>item.textContent?.includes('Jogo consulta GOAL')); const row=card?.querySelector('[data-match-teams]'); if (!row) return null; const home=row.querySelector('[data-match-home]').getBoundingClientRect(),score=row.querySelector('[data-match-score]').getBoundingClientRect(),away=row.querySelector('[data-match-away]').getBoundingClientRect(); return {homeRight:home.right,homeWidth:home.width,homeBottom:home.bottom,scoreLeft:score.left,scoreRight:score.right,scoreTop:score.top,scoreBottom:score.bottom,awayLeft:away.left,awayTop:away.top,awayWidth:away.width,cardRight:card.getBoundingClientRect().right,viewport:innerWidth}; })()",
          returnByValue: true,
        });
        const positions = matchLayout.result.value;
        const legible = positions && (viewport.name === "desktop"
          ? positions.homeRight <= positions.scoreLeft + 1 && positions.scoreRight <= positions.awayLeft + 1
          : positions.homeBottom <= positions.scoreTop + 1 && positions.scoreBottom <= positions.awayTop + 1 && positions.homeWidth >= 180 && positions.awayWidth >= 180);
        if (!legible || positions.cardRight > positions.viewport + 1) {
          throw new Error(`${viewport.name}: nomes das duplas e placar se sobrepõem: ${JSON.stringify(positions)}`);
        }
        const matchControls = await send("Runtime.evaluate", {
          expression: "({manage:Boolean(document.querySelector('a[href^=\"/torneios/\"]')),create:document.body.innerText.includes('Novo evento'),whatsapp: Boolean(document.querySelector('a[href=\"/whatsapp\"]')),dashboard: Boolean(document.querySelector('a[href=\"/painel\"]')),settings:document.querySelector('nav[aria-label=\"Configurações\"] a')?.getAttribute('href') ?? null,breadcrumb:[...document.querySelector('nav[aria-label=\"Caminho de navegação\"]')?.querySelectorAll('span,strong') ?? []].map(item=>item.textContent?.trim()),gamesLink:[...document.querySelectorAll('nav[aria-label=\"Principal\"] a')].find((link)=>link.textContent?.trim()==='Jogos')?.getAttribute('href'),width:innerWidth,scrollWidth:document.documentElement.scrollWidth})",
          returnByValue: true,
        });
        if (matchControls.result.value?.manage || matchControls.result.value?.create || matchControls.result.value?.whatsapp || matchControls.result.value?.dashboard || matchControls.result.value?.settings || JSON.stringify(matchControls.result.value?.breadcrumb) !== JSON.stringify([]) || matchControls.result.value?.gamesLink !== "/torneios" || matchControls.result.value?.scrollWidth > matchControls.result.value?.width + 1) throw new Error(`${viewport.name}: Jogos exibiu gestão, configurações, caminho incoerente, acesso sem permissão ou layout cortado: ${JSON.stringify(matchControls.result.value)}`);
        const matchShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
        await writeFile(`${outputDir}/${viewport.name}-jogos-somente-leitura.png`, Buffer.from(matchShot.data, "base64"));
      }
      const previousCompetition = await db.categoryCompetition.findUniqueOrThrow({ where: { id: competition.id }, select: { status: true } });
      await db.arenaMember.updateMany({
        where: { arenaId: arenaA.id, userId: restrictedUser.id },
        data: { viewPermissions: ["tournaments:view", "matches"], editPermissions: ["tournaments:results"] },
      });
      const resultPairIds = restrictedPairs.map((pair) => pair.id);
      try {
        // O teste anterior encerra o ciclo fictício e deixa a competição em rascunho.
        // Reusamos as duplas fictícias da consulta sem restaurar dados do ciclo encerrado.
        await db.categoryCompetition.update({ where: { id: competition.id }, data: { status: "PUBLISHED" } });
        await db.categoryMatch.update({ where: { id: restrictedMatch.id }, data: {
          homePairId: resultPairIds[0], awayPairId: resultPairIds[1],
          homeScore: null, awayScore: null, homeSet1: null, awaySet1: null, homeSet2: null, awaySet2: null,
        } });
        for (const viewport of adminViewports) {
          const selector = await visit(`/torneios?tournamentId=${league.id}`, viewport, arenaA.id, `${viewport.name}-jogos-permissao-resultados`, restrictedToken);
          if (!selector.includes("Liga A GOAL") || !selector.includes("Lançar resultados")) throw new Error(`${viewport.name}: perfil de resultados não alcançou a categoria.`);
          const body = await visit(`/torneios/${league.id}/categorias/${category.id}?tab=games`, viewport, arenaA.id, `${viewport.name}-categoria-permissao-resultados`, restrictedToken);
          if (!body.includes("Liga A GOAL") || !body.includes("Registrar sets")) throw new Error(`${viewport.name}: jogos da categoria indisponíveis para lançar resultados.`);
          const controls = await send("Runtime.evaluate", {
            expression: "(() => { const tabs=document.querySelector('nav[aria-label=\"Etapas da categoria\"]'); const navRect=tabs?.getBoundingClientRect(); const tabRects=[...(tabs?.querySelectorAll('a') ?? [])].map((tab)=>tab.getBoundingClientRect()); const trigger=[...document.querySelectorAll('button')].find((item)=>item.textContent?.trim()==='Registrar sets'); const rect=trigger?.getBoundingClientRect(); return {tabs:tabs?.innerText ?? '',tabsFit:Boolean(navRect && tabRects.every((tab)=>tab.left >= navRect.left-1 && tab.right <= navRect.right+1 && tab.top >= navRect.top-1 && tab.bottom <= navRect.bottom+1)),schedule:document.body.innerText.includes('Salvar horário') || document.body.innerText.includes('Limpar agendamento'),status:document.body.innerText.includes('Salvar status'),trigger:Boolean(trigger),triggerLeft:rect?.left,triggerRight:rect?.right,width:innerWidth,scrollWidth:document.documentElement.scrollWidth}; })()",
            returnByValue: true,
          });
          const state = controls.result.value;
          if (!state?.trigger || !state.status || !state.tabsFit || state.schedule || /Visão geral|Inscrições|Grupos/.test(state.tabs) || state.triggerLeft < -1 || state.triggerRight > state.width + 1 || state.scrollWidth > state.width + 1) {
            throw new Error(`${viewport.name}: tela de resultados contém edição indevida ou controles cortados: ${JSON.stringify(state)}`);
          }
          const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
          await writeFile(`${outputDir}/${viewport.name}-categoria-permissao-resultados.png`, Buffer.from(shot.data, "base64"));
        }
        const schedule = await fetch(`${baseUrl}/torneios/${league.id}/jogos`, { headers: { Cookie: cookie(arenaA.id, restrictedToken) }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
        await schedule.body?.cancel();
        if (!schedule.headers.get("location")?.includes(`/jogos?tournamentId=${league.id}`)) throw new Error("Perfil de resultados abriu a edição de agenda geral.");
        for (const path of [`/torneios/${league.id}`, `/torneios/${league.id}/categorias`, `/torneios/${league.id}/inscricoes`, "/torneios/novo"]) {
          const management = await fetch(`${baseUrl}${path}`, { headers: { Cookie: cookie(arenaA.id, restrictedToken) }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
          await management.body?.cancel();
          if (management.status === 200 || !management.headers.get("location")?.includes("/jogos")) throw new Error(`Perfil de resultados abriu gestão em ${path} (HTTP ${management.status}).`);
        }
        await db.arenaMember.create({ data: {
          arenaId: arenaB.id, userId: restrictedUser.id, role: "STAFF",
          viewPermissions: ["tournaments:view", "matches"], editPermissions: ["tournaments:results"],
        } });
        try {
          const otherArena = await fetch(`${baseUrl}/torneios/${league.id}/categorias/${category.id}?tab=games`, { headers: { Cookie: cookie(arenaB.id, restrictedToken) }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
          await otherArena.body?.cancel();
          if (otherArena.status !== 404) throw new Error(`Categoria da Arena A não ficou isolada para a Arena B (HTTP ${otherArena.status}).`);
        } finally {
          await db.arenaMember.deleteMany({ where: { arenaId: arenaB.id, userId: restrictedUser.id } });
        }
      } finally {
        try {
          await db.categoryMatch.update({ where: { id: restrictedMatch.id }, data: { homePairId: null, awayPairId: null } });
          await db.categoryCompetition.update({ where: { id: competition.id }, data: { status: previousCompetition.status } });
        } finally {
          await db.arenaMember.updateMany({
            where: { arenaId: arenaA.id, userId: restrictedUser.id },
            data: { viewPermissions: ["calendar", "finance:receivable:view", "matches", "stock"], editPermissions: ["calendar:booking:create"] },
          });
        }
      }
      const settingsResponse = await fetch(`${baseUrl}/agenda/configuracao`, { headers: { Cookie: cookie(arenaA.id, restrictedToken) }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
      await settingsResponse.body?.cancel();
      if (settingsResponse.status !== 404) throw new Error(`Perfil limitado acessou a configuração de quadras (HTTP ${settingsResponse.status}).`);
      await db.arenaMember.updateMany({ where: { arenaId: arenaA.id, userId: restrictedUser.id }, data: { editPermissions: ["calendar:booking:create", "calendar:settings:manage"] } });
      try {
        for (const viewport of [viewports[0], adminViewports[2]]) {
          await visit("/agenda", viewport, arenaA.id, `${viewport.name}-agenda-configuracao-permitida`, restrictedToken);
          const settingsLink = await send("Runtime.evaluate", { expression: "document.querySelector('nav[aria-label=\"Configurações\"] a')?.getAttribute('href') ?? null", returnByValue: true });
          if (settingsLink.result.value !== "/agenda/configuracao") throw new Error(`${viewport.name}: gestor da grade recebeu destino de configurações incorreto: ${settingsLink.result.value}`);
          await visit("/agenda/configuracao", viewport, arenaA.id, `${viewport.name}-configuracao-grade-permitida`, restrictedToken);
        }
      } finally {
        await db.arenaMember.updateMany({ where: { arenaId: arenaA.id, userId: restrictedUser.id }, data: { editPermissions: ["calendar:booking:create"] } });
      }
      const financeSettingsResponse = await fetch(`${baseUrl}/financeiro/configuracoes`, { headers: { Cookie: cookie(arenaA.id, restrictedToken) }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
      await financeSettingsResponse.body?.cancel();
      if (financeSettingsResponse.status !== 404) throw new Error(`Perfil limitado acessou configurações financeiras (HTTP ${financeSettingsResponse.status}).`);
      const financeCategoryResponse = await fetch(`${baseUrl}/financeiro/configuracoes/categorias-financeiras`, { headers: { Cookie: cookie(arenaA.id, restrictedToken) }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
      await financeCategoryResponse.body?.cancel();
      if (financeCategoryResponse.status !== 404) throw new Error(`Perfil limitado acessou categorias financeiras (HTTP ${financeCategoryResponse.status}).`);
      for (const path of ["/financeiro/contas-a-pagar", "/financeiro/folha", "/relatorios", "/relatorios/caixa"]) {
        const response = await fetch(`${baseUrl}${path}`, { headers: { Cookie: cookie(arenaA.id, restrictedToken) }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
        await response.body?.cancel();
        if (response.status !== 404) throw new Error(`Perfil limitado acessou ${path} sem permissão (HTTP ${response.status}).`);
      }
      const plansResponse = await fetch(`${baseUrl}/financeiro/planos`, { headers: { Cookie: cookie(arenaA.id, restrictedToken) }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
      await plansResponse.body?.cancel();
      if (plansResponse.status !== 200) throw new Error(`Perfil de recebíveis não conseguiu consultar os planos (HTTP ${plansResponse.status}).`);
      for (const viewport of viewports) {
        await visit("/financeiro/contas-a-receber", viewport, arenaA.id, `${viewport.name}-financeiro-somente-leitura`, restrictedToken);
        const financeControls = await send("Runtime.evaluate", {
          expression: "({settings:Boolean(document.querySelector('a[href=\"/financeiro/configuracoes\"]')),payable:Boolean(document.querySelector('a[href=\"/financeiro/contas-a-pagar\"]')),payroll:Boolean(document.querySelector('a[href=\"/financeiro/folha\"]')),reports:Boolean(document.querySelector('a[href=\"/relatorios\"]')),create:[...document.querySelectorAll('button')].some(button=>button.textContent?.trim()==='Novo lançamento'),settle:[...document.querySelectorAll('button')].some(button=>button.textContent?.trim()==='Receber'),width:innerWidth,scrollWidth:document.documentElement.scrollWidth})",
          returnByValue: true,
        });
        if (financeControls.result.value?.settings || financeControls.result.value?.payable || financeControls.result.value?.payroll || financeControls.result.value?.reports || financeControls.result.value?.create || financeControls.result.value?.settle || financeControls.result.value?.scrollWidth > financeControls.result.value?.width + 1) {
          throw new Error(`${viewport.name}: perfil financeiro somente leitura exibiu controles de edição ou ficou cortado: ${JSON.stringify(financeControls.result.value)}`);
        }
        const financeShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
        await writeFile(`${outputDir}/${viewport.name}-financeiro-somente-leitura.png`, Buffer.from(financeShot.data, "base64"));
        const calendarLabel = `${viewport.name}-calendario-permissao-leitura`;
        const calendarBody = await visit(`/calendario?periodo=day&data=${futureAgendaDate}`, viewport, arenaA.id, calendarLabel, restrictedToken);
        if (!calendarBody.includes("Evento restrito GOAL")) throw new Error(`${calendarLabel}: evento fictício não apareceu.`);
        const calendarControls = await send("Runtime.evaluate", {
          expression: "(() => { const event = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes('Evento restrito GOAL')); return { create: Boolean(document.querySelector('[data-calendar-create]')), editable: Boolean(event?.dataset.calendarEvent), disabled: Boolean(event?.disabled), width: innerWidth, scrollWidth: document.documentElement.scrollWidth }; })()",
          returnByValue: true,
        });
        if (calendarControls.result.value?.create || calendarControls.result.value?.editable || !calendarControls.result.value?.disabled || calendarControls.result.value?.scrollWidth > calendarControls.result.value?.width + 1) {
          throw new Error(`${calendarLabel}: calendário de leitura permitiu editar ou ficou cortado: ${JSON.stringify(calendarControls.result.value)}`);
        }
        const label = `${viewport.name}-agenda-permissao-criar`;
        const body = await visit(`/agenda?data=${futureAgendaDate}`, viewport, arenaA.id, label, restrictedToken);
        if (!body.includes("Reserva restrita GOAL") || (viewport.name === "desktop" && !body.includes("Operador restrito GOAL"))) throw new Error(`${label}: sessão limitada ou reserva fictícia não apareceu.`);
        const actions = await send("Runtime.evaluate", {
          expression: "(() => { const cell = [...document.querySelectorAll('td')].find((item) => item.textContent?.includes('Reserva restrita GOAL')); if (!cell) return null; cell.scrollIntoView({ block: 'center', inline: 'center' }); const cancel = cell.querySelector('button[aria-label=\"Ações da reserva\"]'); const settings = document.querySelector('button[aria-label=\"Configurações do agendamento online\"]'); cell.querySelector('button')?.click(); return { cancelVisible: Boolean(cancel), settingsVisible: Boolean(settings), opened: Boolean(cell) }; })()",
          returnByValue: true,
        });
        if (!actions.result.value?.opened || actions.result.value.cancelVisible || actions.result.value.settingsVisible) throw new Error(`${label}: ação de cancelamento ou configuração disponível para perfil que só pode criar reservas.`);
        await pause(300);
        const dialog = await send("Runtime.evaluate", {
          expression: "(() => { const el = document.querySelector('[role=dialog][aria-label=\"Agendamento de horário\"]'); if (!el) return null; const footer = el.querySelector('footer'); const rect = el.getBoundingClientRect(); return { canSave: [...(footer?.querySelectorAll('button') ?? [])].some((button) => button.textContent?.includes('Salvar agendamento')), canCancel: [...(footer?.querySelectorAll('button') ?? [])].some((button) => button.textContent?.includes('Cancelar reserva')), overflow: el.scrollWidth > el.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1, left: rect.left, right: rect.right, width: innerWidth }; })()",
          returnByValue: true,
        });
        if (!dialog.result.value || dialog.result.value.canSave || dialog.result.value.canCancel || dialog.result.value.overflow || dialog.result.value.left < -1 || dialog.result.value.right > dialog.result.value.width + 1) {
          throw new Error(`${label}: o modal de leitura ficou cortado ou permitiu editar/cancelar: ${JSON.stringify(dialog.result.value)}`);
        }
        const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
        await writeFile(`${outputDir}/${label}-modal.png`, Buffer.from(shot.data, "base64"));
      }
      console.log("Agenda: perfil limitado a criar não edita ou cancela reservas existentes em desktop e celular.");
    } finally {
      await db.categoryMatch.delete({ where: { id: restrictedMatch.id } });
      await db.categoryPair.deleteMany({ where: { id: { in: restrictedPairs.map((pair) => pair.id) }, competitionId: competition.id } });
      await db.calendarEvent.delete({ where: { id: restrictedCalendarEvent.id } });
      await db.scheduleOccurrenceCourt.deleteMany({ where: { occurrenceId: restrictedBooking.id } });
      await db.scheduleOccurrence.delete({ where: { id: restrictedBooking.id } });
      await db.session.deleteMany({ where: { userId: restrictedUser.id } });
      await db.arenaMember.deleteMany({ where: { userId: restrictedUser.id } });
      await db.user.delete({ where: { id: restrictedUser.id } });
    }
  } finally {
    socket?.close();
    browser?.kill();
    await db.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
