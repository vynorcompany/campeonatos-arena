import { spawn } from 'node:child_process';
import { mkdirSync, chownSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runtimeEnvironment } from './runtime-server.mjs';
import { readBackendBuild } from './lib/backend-build.mjs';

const target = readBackendBuild(resolve('.'));
const environment = runtimeEnvironment(process.env);
const root = process.getuid?.() === 0;
if (process.platform === 'linux' && !root) throw new Error('Backend startup requires a separate restricted operating-system user.');
if (root) {
  for (const directory of ['.next/cache', '.next/server/route-cache']) {
    const path = join(target, directory);
    mkdirSync(path, { recursive: true });
    chownSync(path, 65534, 65534);
  }
  process.setgroups([]);
}
const server = spawn(process.execPath, [join(target, '.next/standalone/server.js')], {
  env: environment, stdio: 'inherit', ...(root ? { uid: 65534, gid: 65534 } : {}),
});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.kill(signal));
server.on('error', () => { console.error('Backend startup failed.'); process.exitCode = 1; });
server.on('exit', code => { process.exitCode = code ?? 1; });
