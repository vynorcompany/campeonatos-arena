import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { backendOrigin, readBackendContract } from '../src/lib/backend/http-client';
import { loginBrandingSchema } from '../src/lib/backend/contracts/login-branding';

test('backend origin rejects credentials, paths and non-HTTP destinations', () => {
  for (const origin of ['file:///etc/passwd', 'https://user:password@example.com', 'https://example.com/api', 'https://example.com/?token=secret', 'https://example.com/#fragment']) {
    assert.throws(() => backendOrigin(origin));
  }
  assert.equal(backendOrigin('http://vx4-backend.railway.internal:3000').hostname, 'vx4-backend.railway.internal');
});

test('public branding contract validates responses and refuses redirects and traversal', async () => {
  let mode = 'valid';
  let requests = 0;
  const server = createServer((_req, res) => {
    requests++;
    if (mode === 'redirect') { res.writeHead(302, { location: '/api/other' }); res.end(); return; }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(mode === 'invalid' ? { arena: { name: 'Arena', databaseUrl: 'private' } } : { arena: { name: 'Arena', logoUrl: null } }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    assert.deepEqual(await readBackendContract(origin, '/api/portal/login-branding?host=arena.example', loginBrandingSchema), { arena: { name: 'Arena', logoUrl: null } });
    for (const path of ['//outside.invalid/api/health', '/api/../private', '/api/%2e%2e/private', '/api/\\outside']) {
      await assert.rejects(readBackendContract(origin, path, loginBrandingSchema));
    }
    assert.equal(requests, 1);
    mode = 'invalid';
    await assert.rejects(readBackendContract(origin, '/api/portal/login-branding', loginBrandingSchema));
    mode = 'redirect';
    await assert.rejects(readBackendContract(origin, '/api/portal/login-branding', loginBrandingSchema));
    assert.equal(requests, 3);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
