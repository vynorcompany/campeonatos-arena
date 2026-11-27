import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
// @ts-expect-error Shared runtime boundary is deliberately dependency-free CJS.
import { backendOnlyHandler, isBackendApiRequest } from '../scripts/lib/backend-boundary.cjs';

test('backend serves only local API paths, including normalized traversal rejection', () => {
  for (const path of ['/api/health', '/api/agents/players?limit=20']) assert.equal(isBackendApiRequest(path), true);
  for (const path of ['/', '/login', '/portal', '/painel', '/_next/static/app.js', '//outside.invalid/api/health', 'https://outside.invalid/api/health', '/api/../login', '/api/%2e%2e/portal']) {
    assert.equal(isBackendApiRequest(path), false, path);
  }
});

test('HTTP boundary never invokes the application for frontend paths', async () => {
  let calls = 0;
  const server = createServer(backendOnlyHandler((_request: unknown, response: any) => { calls++; response.end('api'); }));
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  try {
    for (const path of ['/portal', '/login', '/painel', '/_next/static/app.js']) {
      const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
      assert.equal(response.status, 404);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await response.json(), { error: 'Not found' });
    }
    assert.equal(calls, 0);
    const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
    assert.equal(await response.text(), 'api');
    assert.equal(calls, 1);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
