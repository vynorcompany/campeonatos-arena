import assert from "node:assert/strict";

const databaseUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const sessionToken = process.env.ARENA_GOAL_TEST_SESSION_TOKEN ?? "";
if (process.env.GITHUB_ACTIONS !== "true" || process.env.DATABASE_URL !== databaseUrl ||
    !databaseUrl.startsWith("postgresql://postgres@127.0.0.1:55433/arena_goal?") ||
    !/^[a-f0-9]{40}$/i.test(sessionToken)) {
  throw new Error("O teste de acesso exige o banco fictício e isolado da CI.");
}

const baseUrl = "http://127.0.0.1:3011";
const privateRoutes = [
  "/api/manual-upcoming-matches",
  "/api/whatsapp/pulse",
  "/api/whatsapp/media/synthetic-message",
  "/api/whatsapp/conversations/synthetic-conversation/messages",
  "/api/agenda/availability?courtId=synthetic-court&date=2026-10-17",
];

for (const path of privateRoutes) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  assert.ok([302, 303, 307, 308, 401].includes(response.status), `${path} não exigiu autenticação: HTTP ${response.status}`);
  if (response.status !== 401) assert.equal(new URL(response.headers.get("location"), baseUrl).pathname, "/login", `${path} redirecionou para fora do login`);
}

for (const path of ["/api/jobs/financial-online-charges", "/api/jobs/league-monthly-close", "/api/integrations/evolution/webhook"]) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST", redirect: "manual",
    headers: { "content-type": "application/json" }, body: "{}",
  });
  assert.equal(response.status, 401, `${path} aceitou chamada sem segredo`);
}

console.log(`Acesso negado em ${privateRoutes.length + 3} rotas protegidas.`);
