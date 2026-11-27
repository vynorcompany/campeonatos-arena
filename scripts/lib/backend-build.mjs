import { cpSync, chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';

// Generate only API routes. Shared business modules remain in their canonical
// source location; no administrative or athlete page enters the route tree.
export function prepareBackendBuild(root) {
  const directory = join(root, '.service-build');
  mkdirSync(directory, { recursive: true });
  const target = mkdtempSync(join(directory, 'backend-'));
  // mkdtemp starts private (0700); the restricted HTTP user must be able to
  // traverse the generated code directory after the root launcher drops UID.
  chmodSync(target, 0o755);
  cpSync(join(root, 'src/app/api'), join(target, 'src/app/api'), { recursive: true });
  const tsconfig = JSON.parse(readFileSync(join(root, 'tsconfig.json'), 'utf8'));
  tsconfig.compilerOptions.paths = { '@/*': [relative(target, join(root, 'src/*'))] };
  tsconfig.compilerOptions.incremental = false;
  tsconfig.include = ['next-env.d.ts', 'src/**/*.ts', '.next/types/**/*.ts', relative(target, join(root, 'src/**/*.d.ts'))];
  tsconfig.exclude = ['node_modules'];
  writeFileSync(join(target, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
  writeFileSync(join(target, 'package.json'), JSON.stringify({ name: 'vx4-backend', private: true, version: '0.1.0' }));
  const configuration = `import base from '../../next.config.mjs';\nexport default {...base,outputFileTracingRoot:${JSON.stringify(root)},experimental:{...base.experimental,externalDir:true}};\n`;
  writeFileSync(join(target, 'next.config.mjs'), configuration);
  return target;
}

export function backendServerEntry() {
  return `const http = require('node:http');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const software = path.resolve(root, '..', '..');
const next = require(path.join(software, 'node_modules/next'));
const { productionAuditHandler } = require(path.join(software, 'scripts/request-audit.cjs'));
const { backendOnlyHandler } = require(path.join(software, 'scripts/lib/backend-boundary.cjs'));
const app = next({dev:false,dir:root});
app.prepare().then(()=>{
 const handle = backendOnlyHandler(productionAuditHandler(app.getRequestHandler(),root));
 http.createServer((req,res)=>handle(req,res)).listen(Number(process.env.PORT||3000),process.env.HOSTNAME||'0.0.0.0');
}).catch(()=>{console.error('Backend startup failed.');process.exitCode=1;});
`;
}

export function recordBackendBuild(root, target) {
  const standalone = join(target, '.next/standalone');
  mkdirSync(standalone, { recursive: true });
  writeFileSync(join(standalone, 'server.js'), backendServerEntry());
  writeFileSync(join(root, '.service-build/backend.json'), JSON.stringify({ version: 1, directory: relative(root, target) }));
}

export function readBackendBuild(root) {
  const value = JSON.parse(readFileSync(join(root, '.service-build/backend.json'), 'utf8'));
  if (value.version !== 1 || typeof value.directory !== 'string' || !/^\.service-build\/backend-[a-zA-Z0-9]+$/.test(value.directory)) {
    throw new Error('Invalid backend build manifest.');
  }
  return resolve(root, value.directory);
}
