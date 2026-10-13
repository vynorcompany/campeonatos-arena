import { spawn } from "node:child_process";
import { mkdirSync, chownSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function runtimeEnvironment(source) {
  let url;
  try { url = new URL(source.APP_DATABASE_URL || ""); }
  catch { throw new Error('A conexão limitada do servidor web é obrigatória.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || decodeURIComponent(url.username) !== 'arena_runtime') {
    throw new Error('O servidor web exige a conexão arena_runtime.');
  }
  const port = Number(source.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('A porta do servidor web é inválida.');
  // The custom Next server bypasses start-server, which normally sets this for
  // the internal fetch performed after a Server Action redirects.
  const environment = {
    ...source,
    DATABASE_URL: source.APP_DATABASE_URL,
    HOSTNAME: '0.0.0.0',
    __NEXT_PRIVATE_ORIGIN: `http://127.0.0.1:${port}`,
  };
  for (const key of ['DIRECT_URL', 'PGPASSWORD', 'PGUSER', 'PGDATABASE', 'PGHOST', 'PGPORT']) delete environment[key];
  return environment;
}

export function runtimeWritableDirectories() {
  // The generated server uses /app as its Next root, not .next/standalone.
  return ['.next/cache', '.next/server/route-cache', '.next/standalone/public/uploads'];
}

function start() {
  const environment = runtimeEnvironment(process.env);
  const root = process.getuid?.() === 0;
  if (process.platform === 'linux' && !root) throw new Error('O inicializador precisa separar o usuário web do usuário das migrações.');
  if (root) {
    for (const directory of runtimeWritableDirectories()) {
      mkdirSync(directory, { recursive: true });
      chownSync(directory, 65534, 65534);
    }
    process.setgroups([]);
  }
  const server = spawn(process.execPath, [resolve('.next/standalone/server.js')], {
    env: environment, stdio: 'inherit', ...(root ? { uid: 65534, gid: 65534 } : {})
  });
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.kill(signal));
  server.on('error', () => { console.error('Não foi possível iniciar o servidor web limitado.'); process.exitCode = 1; });
  server.on('exit', code => { process.exitCode = code ?? 1; });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) start();
