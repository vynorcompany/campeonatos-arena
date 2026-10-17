import { PrismaClient } from "@prisma/client";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

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
const agencyRoutes = [
  "/agencia", "/agencia/planos", "/agencia/arenas", "/agencia/arenas/usuarios", "/agencia/conexoes",
  "/agencia/financeiro", "/agencia/financeiro/mrr", "/agencia/financeiro/previsoes",
  "/agencia/suporte", "/agencia/suporte/historico",
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
    await send("Emulation.setLocaleOverride", { locale: "pt-BR" });
    const cookie = (arenaId) => `padel_session=${sessionToken}; padel_arena=${arenaId}`;
    const selectArena = async (arenaId) => {
      const session = await send("Network.setCookie", { name: "padel_session", value: sessionToken, url: baseUrl, httpOnly: true, sameSite: "Lax" });
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
    const visit = async (path, viewport, arenaId, label) => {
      const pathname = path.split("?", 1)[0];
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
    for (const viewport of viewports) {
      for (const route of routes) {
        const label = `${viewport.name}-${route.replaceAll("/", "-").replace(/^-/, "")}`;
        const body = await visit(route, viewport, arenaA.id, label);
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
        if (route === "/jogadores") {
          if (viewport.name === "mobile") {
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
        const label = `${viewport.name}-${route.replaceAll("/", "-").replace(/^-/, "")}`;
        await visit(route, viewport, arenaA.id, label);
      }
    }
    const futureAgendaDate = new Date(Date.now() + 3 * 24 * 60 * 60_000).toISOString().slice(0, 10);
    for (const viewport of viewports) {
      const agendaPath = `/agenda?data=${futureAgendaDate}`;
      const response = await fetch(`${baseUrl}${agendaPath}`, { headers: { Cookie: cookie(arenaA.id) }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
      await response.body?.cancel();
      if (response.status !== 200) throw new Error(`${viewport.name}: agenda futura indisponível (HTTP ${response.status}).`);
      await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.name === "mobile" });
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
        expression: `(() => { const element = Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find((candidate) => { const rect = candidate.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; }); if (!element) return null; element.scrollIntoView({ block: 'center' }); const rect = element.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width, height: rect.height }; })()`,
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
    const expectedDarkText = {
      avisos: { ".portal-announcements-feed > p.muted": "rgb(164, 200, 185)" },
      super12: { ".super12-empty strong": "rgb(234, 255, 243)", ".super12-empty p": "rgb(164, 200, 185)" },
      reservas: { ".portal-activity-list article strong": "rgb(234, 255, 243)", ".portal-activity-list article span": "rgb(164, 200, 185)", ".portal-activity-list article b": "rgb(94, 229, 189)" },
      perfil: { ".avatar-crop-field > small": "rgb(164, 200, 185)" },
    };
    const expectedDesktopText = {
      avisos: { ".portal-announcements-feed > p.muted": "rgb(164, 200, 185)" },
      super12: { ".super12-empty strong": "rgb(234, 255, 243)", ".super12-empty p": "rgb(164, 200, 185)" },
      reservas: { ".portal-activity-list article strong": "rgb(19, 48, 71)" },
      perfil: { ".avatar-crop-field > small": "rgb(164, 200, 185)" },
    };
    const expectedMobileLightText = {
      avisos: { ".portal-announcements-feed > p.muted": "rgb(96, 126, 141)" },
      super12: { ".super12-empty strong": "rgb(19, 48, 71)" },
      perfil: { ".avatar-crop-field > small": "rgb(96, 126, 141)" },
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
          const expected = viewport.name === "desktop" ? expectedDesktopText[view.label] : theme === "dark" ? expectedDarkText[view.label] : expectedMobileLightText[view.label];
          if (expected) {
            const rendered = await send("Runtime.evaluate", {
              expression: `Object.fromEntries(${JSON.stringify(Object.keys(expected))}.map((selector) => [selector, document.querySelector(selector) ? getComputedStyle(document.querySelector(selector)).color : null]))`,
              returnByValue: true,
            });
            for (const [selector, color] of Object.entries(expected)) {
              if (rendered.result.value?.[selector] !== color) {
                throw new Error(`${label}: contraste insuficiente em ${selector}: ${rendered.result.value?.[selector] ?? "ausente"}; esperado ${color}.`);
              }
            }
          }
          if (view.label === "inicio" && (!metrics.main.includes(viewport.name === "mobile" ? "Comanda em aberto" : "em aberto") || metrics.main.includes("Tudo em dia"))) {
            throw new Error(`${label}: a tela inicial ignora a comanda aberta do atleta fictício.`);
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
    const betaResponse = await fetch(`${baseUrl}/classificacao/arena-beta-goal?section=finance`, { headers: { Cookie: portalCookie }, signal: AbortSignal.timeout(20_000) });
    const betaHtml = await betaResponse.text();
    if (betaResponse.status !== 200 || !betaHtml.includes("Seu espaço dentro e fora da quadra.") || betaHtml.includes("Receita beta GOAL")) {
      throw new Error("A sessão do atleta da arena A obteve conteúdo privado da arena B.");
    }
    console.log("Portal do Atleta validado em desktop, celular claro/escuro e sem dados financeiros de outra arena.");

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
    const mobileWhatsapp = await visit("/whatsapp", viewports[1], arenaA.id, "whatsapp-conversa-mobile");
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
    const chatLayout = await send("Runtime.evaluate", {
      expression: "({width:document.querySelector('.whatsapp-chat-main')?.getBoundingClientRect().width ?? 0, viewport:innerWidth, detailsButtonVisible:!!document.querySelector('.whatsapp-chat-main button[aria-label=\"Detalhes do contato\"]')?.getClientRects().length})",
      returnByValue: true,
    });
    if (chatLayout.result.value.width < chatLayout.result.value.viewport - 50 || !chatLayout.result.value.detailsButtonVisible) {
      throw new Error("O chat mobile não ocupou a largura disponível ou perdeu o acesso aos detalhes do contato.");
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
    await writeFile(`${outputDir}/whatsapp-conversa-mobile-aberta.png`, Buffer.from(whatsappMobileShot.data, "base64"));

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
        if (!finance.includes("R$ 149,00 em faturas com estorno ou contestação informada")) throw new Error(`${viewport.name}: o financeiro da agência não destacou a fatura em revisão.`);
      }
    } finally {
      if (agencyInvoice) await db.agencyInvoice.delete({ where: { id: agencyInvoice.id } });
      if (agencyEntry) await db.financialEntry.delete({ where: { id: agencyEntry.id } });
      if (agencySubscription) await db.agencySubscription.delete({ where: { id: agencySubscription.id } });
      await db.agencyPlan.delete({ where: { id: agencyPlan.id } });
    }
  } finally {
    socket?.close();
    browser?.kill();
    await db.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
