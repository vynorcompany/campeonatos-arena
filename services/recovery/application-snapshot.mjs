import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { snapshotCommand } from './snapshot-command.mjs';
import { atomicJson } from './vault.mjs';

/** Keep one encrypted application artifact per deployed build, rather than copying it hourly. */
export async function captureApplication({ config, snapshot, temporary, root, key, railway, command, consumeProcess }) {
  const alias = 'arena-application-recovery';
  const sshConfig = join(temporary, 'application-ssh-config');
  await writeFile(sshConfig, railway(config, ['ssh', 'config', '--dry-run', '-p', config.projectId, '-e', config.environmentId, '-s', snapshot.serviceId, '--alias', alias, '-i', config.identityFile]), { mode: 0o600 });
  const args = ['-T', '-F', sshConfig, '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'UserKnownHostsFile=' + config.knownHosts, alias];
  const status = () => {
    const result = JSON.parse(command('ssh', [...args, snapshotCommand({ kind: 'application-status' })]).toString());
    if (!/^[a-f0-9]{40}$/.test(result.revision || '') || !/^[A-Za-z0-9_-]{1,128}$/.test(result.buildId || '')) throw new Error('Application artifact identity unavailable.');
    return result;
  };
  const application = status();
  const identity = createHash('sha256').update(application.revision + ':' + application.buildId).digest('hex');
  const cacheFile = join(root, 'application-' + identity + '.json');
  try {
    const cached = JSON.parse(await readFile(cacheFile, 'utf8'));
    if (!/^[a-f0-9]{64}$/.test(cached.sha256 || '') || !Number.isSafeInteger(cached.bytes) || cached.bytes <= 0) throw new Error('Invalid artifact metadata.');
    if (!/^objects\/[a-f0-9-]+\.enc$/.test(cached.file)) throw new Error('Unsafe artifact path.');
    if ((await stat(join(root, cached.file))).size !== cached.bytes + 36) throw new Error('Incomplete cached artifact.');
    return { application, snapshot: { ...cached, name: snapshot.name, kind: 'application' } };
  } catch {
    // A missing/incomplete cache is rebuilt; no retained snapshot is overwritten or removed.
  }
  const file = 'objects/' + randomUUID() + '.enc';
  const child = spawn('ssh', [...args, snapshotCommand(snapshot)], { stdio: ['ignore', 'pipe', 'pipe'] });
  const captured = await consumeProcess(child, join(root, file), key, config.immutable);
  if (JSON.stringify(status()) !== JSON.stringify(application)) throw new Error('Application changed while its artifact was being copied.');
  const result = { name: snapshot.name, kind: 'application', file, ...captured };
  await atomicJson(cacheFile, result);
  return { application, snapshot: result };
}
