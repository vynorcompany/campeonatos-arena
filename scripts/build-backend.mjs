import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { prepareBackendBuild, recordBackendBuild } from './lib/backend-build.mjs';

const root = resolve('.');
execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'generate'], { stdio: 'inherit' });
const target = prepareBackendBuild(root);
execFileSync(process.execPath, ['node_modules/next/dist/bin/next', 'build', target], { stdio: 'inherit' });
recordBackendBuild(root, target);
console.log('VX4 backend API build completed.');
