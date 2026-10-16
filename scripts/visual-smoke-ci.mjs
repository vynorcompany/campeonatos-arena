import { PrismaClient } from "@prisma/client";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const databaseUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const sessionToken = process.env.ARENA_GOAL_TEST_SESSION_TOKEN ?? "";
if (process.env.GITHUB_ACTIONS !== "true" ||
    process.env.DATABASE_URL !== databaseUrl ||
    !databaseUrl.startsWith("postgresql://postgres@127.0.0.1:55433/arena_goal?") ||
    !/^[a-f0-9]{40}$/i.test(sessionToken)) {
  throw new Error("O teste visual exige o banco fictício e isolado da CI.");
}

const baseUrl = "http://127.0.0.1:3011";
const outputDir = "artifacts/visual-smoke";
const browserPort = 31991;
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const routes = [
  "/painel", "/assistente", "/whatsapp", "/usuarios", "/minha-conta",
  "/torneios", "/torneios/novo", "/torneios/inscricoes", "/torneios/rankings", "/torneios/rankings/novo",
  "/jogos", "/grupos", "/duplas", "/agenda", "/agenda/configuracao", "/calendario", "/comandas",
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
  "/arena", "/arena/regulamento", "/suporte",
];
const viewports = [
  { name: "desktop", width: 1366, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
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
    const cookie = (arenaId) => `padel_session=${sessionToken}; padel_arena=${arenaId}`;
    const selectArena = async (arenaId) => {
      const session = await send("Network.setCookie", { name: "padel_session", value: sessionToken, url: baseUrl, httpOnly: true, sameSite: "Lax" });
      const arena = await send("Network.setCookie", { name: "padel_arena", value: arenaId, url: baseUrl, httpOnly: true, sameSite: "Lax" });
      if (!session.success || !arena.success) throw new Error("Não foi possível configurar a sessão de teste.");
    };
    const visit = async (path, viewport, arenaId, label) => {
      const response = await fetch(`${baseUrl}${path}`, { headers: { Cookie: cookie(arenaId) }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
      await response.body?.cancel();
      if (response.status !== 200) throw new Error(`${label}: HTTP ${response.status} (${response.headers.get("location") ?? "sem destino"})`);
      await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.name === "mobile" });
      await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
      await selectArena(arenaId);
      await send("Page.navigate", { url: `${baseUrl}${path}` });
      let metrics;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const result = await send("Runtime.evaluate", {
          expression: pageMetricsExpression,
          returnByValue: true,
        });
        metrics = result.result.value;
        if (metrics?.ready === "complete" && metrics.mainBody.trim().length >= 15 && metrics.path === path) break;
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
      if (metrics.path !== path || metrics.mainBody.trim().length < 15 || metrics.scrollWidth > metrics.width + 1 || /Algo saiu do fluxo|Application error|Internal Server Error/i.test(metrics.body)) {
        throw new Error(`${label}: layout ou navegação inválida: ${JSON.stringify({ path: metrics.path, width: metrics.width, scrollWidth: metrics.scrollWidth, mainBodyLength: metrics.mainBody.trim().length })}`);
      }
      console.log(`${label}: HTTP 200, ${metrics.width}px, sem overflow horizontal`);
      return metrics.body;
    };
    for (const viewport of viewports) {
      for (const route of routes) {
        const label = `${viewport.name}-${route.replaceAll("/", "-").replace(/^-/, "")}`;
        const body = await visit(route, viewport, arenaA.id, label);
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
            expression: "(() => { const select = document.querySelector('.entity-edit-form select[name=\"permissionProfileId\"]'); const grid = select?.closest('.entity-edit-grid-user'); return { visible: Boolean(select), overflow: document.documentElement.scrollWidth > innerWidth + 1, widthRatio: select && grid ? select.getBoundingClientRect().width / grid.getBoundingClientRect().width : 0, options: [...(select?.options ?? [])].map(option => option.text) }; })()",
            returnByValue: true,
          });
          if (!editor.result.value.visible || editor.result.value.overflow || editor.result.value.widthRatio < 0.85 ||
              !editor.result.value.options.includes("Acesso legado · Proprietário") ||
              editor.result.value.options.some((option) => option.includes("Migrado · OWNER"))) {
            throw new Error(`${label}: edição do usuário inválida: ${JSON.stringify(editor.result.value)}`);
          }
          const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: true });
          await writeFile(`${outputDir}/${label}-edit.png`, Buffer.from(shot.data, "base64"));
        }
      }
    }
    const mobile = viewports[1];
    const betaBody = await visit("/jogadores", mobile, arenaB.id, "mobile-clients-arena-b");
    const alphaBody = await visit("/jogadores", mobile, arenaA.id, "mobile-clients-arena-a");
    if (!betaBody.includes("Atleta Exclusivo Outra Arena GOAL") || betaBody.includes("Atleta GOAL A") ||
        !alphaBody.includes("Atleta GOAL A") || alphaBody.includes("Atleta Exclusivo Outra Arena GOAL")) {
      throw new Error("A lista de clientes não respeitou a arena selecionada.");
    }
    console.log("Isolamento entre arenas validado na lista de clientes.");

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
    if (!cookies.cookies.some((item) => item.name === "padel_session")) throw new Error("Login não criou sessão.");

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
      const evaluated = await send("Runtime.evaluate", {
        expression: `(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) return null; element.scrollIntoView({ block: 'center' }); const rect = element.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width, height: rect.height }; })()`,
        returnByValue: true,
      });
      const point = evaluated.result.value;
      if (!point || point.width < 1 || point.height < 1) throw new Error(`Controle de navegação ausente: ${selector}`);
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
    };
    for (const viewport of viewports) {
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
        await clickElement('button[aria-label="Abrir menu"]');
        const menu = await send("Runtime.evaluate", { expression: "({open:document.querySelector('button[aria-label=\"Abrir menu\"]')?.getAttribute('aria-expanded'),sidebar:document.querySelector('#arena-mobile-navigation')?.getBoundingClientRect().width})", returnByValue: true });
        if (menu.result.value.open !== "true" || menu.result.value.sidebar < 200) throw new Error(`Menu mobile não abriu: ${JSON.stringify(menu.result.value)}`);
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
      console.log(`${viewport.name}: clique real no menu lateral abriu Clientes e liberou a rolagem.`);
    }
    await send("Network.setCookie", { name: "padel_arena", value: arenaB.id, url: baseUrl, httpOnly: true, sameSite: "Lax" });
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
    const portalViews = [
      { label: "inicio", query: "section=home" },
      { label: "avisos", query: "section=announcements" },
      { label: "financas", query: "section=finance" },
      { label: "comandas", query: "section=comandas" },
      { label: "torneios-jogos", query: "section=leagues&leagueTab=games" },
      { label: "torneios-duplas", query: "section=leagues&leagueTab=pairs" },
      { label: "torneios-ranking", query: "section=leagues&leagueTab=ranking" },
      { label: "super12", query: "section=leagues&eventTab=super12" },
      { label: "reservar", query: "section=booking" },
      { label: "reservas", query: "section=reservations" },
      { label: "aulas", query: "section=lessons" },
      { label: "turmas", query: "section=classes" },
      { label: "radar", query: "section=radar" },
      { label: "perfil", query: "section=profile" },
    ];
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
          const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
          await writeFile(`${outputDir}/${label}.png`, Buffer.from(shot.data, "base64"));
          if (metrics.path !== "/home" || !metrics.authenticated || metrics.main.trim().length < 40 || metrics.scrollWidth > metrics.width + 1 || /Algo saiu do fluxo|Application error|Internal Server Error/i.test(metrics.body) || metrics.body.includes("Receita beta GOAL")) {
            throw new Error(`${label}: portal inválido: ${JSON.stringify({ path: metrics.path, authenticated: metrics.authenticated, mainLength: metrics.main.trim().length, width: metrics.width, scrollWidth: metrics.scrollWidth })}`);
          }
          console.log(`${label}: HTTP 200, sessão fictícia válida e sem overflow horizontal`);
        }
      }
    }
    const betaResponse = await fetch(`${baseUrl}/classificacao/arena-beta-goal?section=finance`, { headers: { Cookie: portalCookie }, signal: AbortSignal.timeout(20_000) });
    const betaHtml = await betaResponse.text();
    if (betaResponse.status !== 200 || !betaHtml.includes("Seu espaço dentro e fora da quadra.") || betaHtml.includes("Receita beta GOAL")) {
      throw new Error("A sessão do atleta da arena A obteve conteúdo privado da arena B.");
    }
    console.log("Portal do Atleta validado em desktop, celular claro/escuro e sem dados financeiros de outra arena.");
  } finally {
    socket?.close();
    browser?.kill();
    await db.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
