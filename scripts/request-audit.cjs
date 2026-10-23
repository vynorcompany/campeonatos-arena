const { createHash, randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const digest = value => createHash('sha256').update(value).digest('hex');
function cookiesOf(value) {
  const values = new Map();
  for (const part of String(value || '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0) { try { values.set(part.slice(0, at).trim(), decodeURIComponent(part.slice(at + 1).trim())); } catch {} }
  }
  return values;
}
function requestUrl(req) {
  try { return new URL(req.url || '/', 'http://audit.invalid'); }
  catch { return new URL('/invalid-request', 'http://audit.invalid'); }
}
function shouldAudit(req) {
  const path = requestUrl(req).pathname;
  return !path.startsWith('/_next/') && path !== '/api/health' && path !== '/favicon.ico' &&
    req.headers['next-router-prefetch'] !== '1' && req.headers.purpose !== 'prefetch';
}
function operationOf(req, manifest) {
  const reference = String(req.headers['next-action'] || '');
  if (reference && Object.hasOwn(manifest.node || {}, reference)) return `ACTION:${manifest.node[reference].exportedName}`;
  const path = requestUrl(req).pathname;
  return path.startsWith('/api/') ? `API:${req.method || 'GET'}` : req.method === 'GET' ? 'PAGE_VIEW' : `REQUEST:${req.method || 'POST'}`;
}
async function scoped(db, arenaId, operation, requestId) {
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId || ''}, true)`;
    if (requestId) await tx.$executeRaw`SELECT set_config('app.audit_request_id', ${requestId}, true)`;
    return operation(tx);
  });
}
async function resolveActor(db, req, source = process.env, responseCookies = [], publicAction = false) {
  const cookies = cookiesOf(req.headers.cookie);
  for (const value of responseCookies) {
    const entry = cookiesOf(String(value).split(';', 1)[0]);
    for (const [name, token] of entry) if (token) cookies.set(name, token);
  }
  const now = new Date();
  const url = requestUrl(req);
  const publicRoute = publicAction || /^\/(?:home|portal|classificacao|reservar|checkin)(?:\/|$)/.test(url.pathname) || /^\/[^/]+\/portaldoatleta(?:\/|$)/.test(url.pathname) || /^\/api\/(?:reservar|checkin)(?:\/|$)/.test(url.pathname);
  const agentRoute = url.pathname.startsWith('/api/agents/');
  if (url.pathname.startsWith('/api/jobs/') && source.CRON_SECRET &&
      (req.headers.authorization === `Bearer ${source.CRON_SECRET}` || req.headers['x-cron-secret'] === source.CRON_SECRET)) {
    return { arenaId: null, actorId: 'SYSTEM:JOBS', actorName: 'Agendamento automático' };
  }
  const sessionToken = cookies.get(source.SESSION_COOKIE_NAME || 'padel_session');
  if (sessionToken && !publicRoute && !agentRoute) {
    const session = await db.session.findUnique({ where: { token: digest(sessionToken) }, select: { expiresAt: true, user: { select: { id: true, name: true, systemRole: true, memberships: { select: { arenaId: true }, orderBy: { createdAt: 'asc' } } } } } });
    if (session && session.expiresAt > now) {
      const user = session.user;
      const selected = cookies.get(source.ARENA_COOKIE_NAME || 'padel_arena');
      let arenaId = user.memberships.find(member => member.arenaId === selected)?.arenaId || user.memberships[0]?.arenaId || null;
      if (selected && ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.systemRole)) {
        arenaId = (await db.arena.findUnique({ where: { id: selected }, select: { id: true } }))?.id || arenaId;
      }
      if (!arenaId && ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.systemRole)) {
        arenaId = (await db.arena.findFirst({ orderBy: { name: 'asc' }, select: { id: true } }))?.id || null;
      }
      if (/^\/(?:agencia|api\/integrations\/payments\/mercado-pago\/agency)(?:\/|$)/.test(url.pathname)) arenaId = null;
      return { arenaId, actorId: user.id, actorName: user.name };
    }
  }
  const bearer = /^Bearer (arena_[a-f0-9]{64})$/.exec(String(req.headers.authorization || ''));
  if (bearer && agentRoute) {
    const hash = digest(bearer[1]);
    const [key] = await db.$queryRaw`SELECT * FROM public.authenticate_agent_key(${hash})`;
    if (key) {
      const record = await scoped(db, key.arenaId, tx => tx.agentApiKey.findUnique({ where: { id: key.id }, select: { name: true } }));
      return { arenaId: key.arenaId, actorId: key.id, actorName: `Agente: ${record?.name || 'API'}` };
    }
  }
  const playerToken = cookies.get('arena_player_session');
  if (playerToken && !agentRoute) {
    const session = await db.playerSession.findFirst({ where: { token: { in: [playerToken, digest(playerToken)] }, expiresAt: { gt: now } }, select: { athleteIdentityId: true, playerAccount: { select: { id: true, arenaId: true, playerId: true, identityId: true } } } });
    if (session) {
      const identityId = session.athleteIdentityId || session.playerAccount.identityId;
      const accounts = identityId ? await db.playerAccount.findMany({ where: { identityId }, select: { id: true, arenaId: true, playerId: true } }) : [session.playerAccount];
      const segments = url.pathname.split('/').filter(Boolean);
      const slug = url.searchParams.get('arena') || (['classificacao', 'reservar', 'checkin'].includes(segments[0]) ? segments[1] : segments[1] === 'portaldoatleta' ? segments[0] : null);
      const arena = slug ? await db.arena.findUnique({ where: { slug }, select: { id: true } }) : null;
      const account = accounts.find(item => item.arenaId === arena?.id) || session.playerAccount;
      const player = await scoped(db, account.arenaId, tx => tx.player.findUnique({ where: { id: account.playerId }, select: { name: true } }));
      return { arenaId: account.arenaId, actorId: account.playerId, actorName: player?.name || 'Cliente do portal' };
    }
  }
  return { arenaId: null, actorId: 'ANONYMOUS', actorName: 'Não autenticado' };
}

/** Audit every application request centrally, without inspecting its body or query string. */
function createAuditedHandler(handle, { db, manifest = {}, source = process.env, onError = () => console.error('Falha ao atualizar o registro de auditoria da requisição.') }) {
  return async (req, res) => {
    if (!shouldAudit(req)) return handle(req, res);
    const id = randomUUID();
    const started = Date.now();
    const path = requestUrl(req).pathname;
    const details = { source: 'HTTP', method: req.method || 'GET', path, stage: 'REQUESTED' };
    const actionSource = manifest.node?.[String(req.headers['next-action'] || '')]?.filename || '';
    const publicAction = /(?:^|\/)(?:public-[^/]+|player-auth)\.ts$/.test(actionSource);
    let actor;
    try {
      actor = await resolveActor(db, req, source, [], publicAction);
      await scoped(db, actor.arenaId, tx => tx.auditEvent.create({ data: { id, ...actor, action: operationOf(req, manifest), entityId: id, details } }), id);
    } catch {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Não foi possível registrar a solicitação. Tente novamente.');
      onError();
      return;
    }
    let finished = false;
    const complete = async aborted => {
      if (finished) return;
      finished = true;
      try {
        const setCookie = res.getHeader('set-cookie');
        const responseCookies = Array.isArray(setCookie) ? setCookie : setCookie ? [String(setCookie)] : [];
        const identified = actor.actorId === 'ANONYMOUS' && responseCookies.length ? await resolveActor(db, req, source, responseCookies, publicAction) : actor;
        await scoped(db, identified.arenaId, tx => tx.auditEvent.update({ where: { id }, data: { ...identified, details: { ...details, stage: aborted ? 'INTERRUPTED' : 'RESPONDED', statusCode: res.statusCode, elapsedMs: Date.now() - started, attachment: /attachment/i.test(String(res.getHeader('content-disposition') || '')) } } }), id);
      } catch { onError(); }
    };
    res.once('finish', () => { void complete(false); });
    res.once('close', () => { if (!res.writableFinished) void complete(true); });
    try { return await handle(req, res); }
    catch {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      }
      await complete(true);
      if (!res.writableEnded) res.end('Não foi possível concluir a solicitação.');
    }
  };
}
function productionAuditHandler(handle, rootDir) {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient({ datasources: { db: { url: process.env.APP_DATABASE_URL || process.env.DATABASE_URL } } });
  const manifest = JSON.parse(readFileSync(join(rootDir, '.next/server/server-reference-manifest.json'), 'utf8'));
  return createAuditedHandler(handle, { db, manifest });
}
module.exports = { cookiesOf, shouldAudit, operationOf, resolveActor, createAuditedHandler, productionAuditHandler };
