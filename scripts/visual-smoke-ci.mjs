import { PrismaClient } from "@prisma/client";
import { spawn } from "node:child_process";
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
  "/painel", "/whatsapp", "/usuarios", "/agenda", "/torneios",
  "/jogadores", "/financeiro/contas-a-receber", "/pdv/caixa", "/relatorios", "/arena",
];
const viewports = [
  { name: "desktop", width: 1366, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

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
          expression: "({path:location.pathname,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,body:document.body?.innerText ?? '',ready:document.readyState})",
          returnByValue: true,
        });
        metrics = result.result.value;
        if (metrics?.ready === "complete" && metrics.body.length >= 80 && metrics.path === path) break;
        await pause(200);
      }
      await pause(1200);
      const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
      await writeFile(`${outputDir}/${label}.png`, Buffer.from(shot.data, "base64"));
      if (metrics.path !== path || metrics.body.length < 80 || metrics.scrollWidth > metrics.width + 1 || /Algo saiu do fluxo|Application error|Internal Server Error/i.test(metrics.body)) {
        throw new Error(`${label}: layout ou navegação inválida: ${JSON.stringify({ path: metrics.path, width: metrics.width, scrollWidth: metrics.scrollWidth, bodyLength: metrics.body.length })}`);
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
  } finally {
    socket?.close();
    browser?.kill();
    await db.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
