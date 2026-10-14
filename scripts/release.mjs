import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { backupStorage, verifyBackup, switchRelease } from '../src/operations.js';

const execute = promisify(execFile);
const [action, rootValue, release] = process.argv.slice(2);
if (!rootValue || !['backup', 'verify', 'activate', 'rollback'].includes(action)) throw new Error('Usage: node scripts/release.mjs backup|verify|activate|rollback ABSOLUTE_ROOT [RELEASE_OR_BACKUP_PATH]');
if (!path.isAbsolute(rootValue)) throw new Error('Release root must be absolute.');
const root = path.resolve(rootValue);
if (action === 'verify') {
  if (!release) throw new Error('Provide the absolute backup path.');
  console.log(JSON.stringify(await verifyBackup(release)));
} else {
  if (process.env.RELEASE_APPROVED !== `${action}-${process.env.DEPLOY_ENV}` || !['staging', 'production'].includes(process.env.DEPLOY_ENV)) throw new Error('Explicit RELEASE_APPROVED matching action and DEPLOY_ENV is required.');
  const application = process.env.PM2_APP_NAME || 'anchevfilms';
  if (!/^[a-zA-Z0-9_-]+$/.test(application)) throw new Error('Invalid process name.');
  const shared = path.join(root, 'shared');
  const backups = path.join(shared, 'backups');
  await mkdir(backups, { recursive: true, mode: 0o700 });
  if (action !== 'backup') {
    if (!/^[a-zA-Z0-9_-]+$/.test(release || '')) throw new Error('Provide a prepared release identifier.');
    await lstat(path.join(root, 'releases', release, 'server.js'));
  }
  await execute('pm2', ['stop', application]);
  let activated = false;
  try {
    const destination = path.join(backups, `${new Date().toISOString().replace(/[:.]/g, '-')}-${action}`);
    await backupStorage({ dataDir: path.join(shared, 'data'), uploadsDir: path.join(shared, 'uploads'), backupDir: destination });
    console.log(`Verified offline backup: ${destination}`);
    if (action !== 'backup') {
      const result = await switchRelease({
        root, release,
        restart: async (directory) => {
          await execute('pm2', ['startOrRestart', path.join(directory, 'ecosystem.config.cjs'), '--only', application, '--update-env'], { env: { ...process.env, RELEASE_DIR: directory, DATA_DIR: path.join(shared, 'data'), UPLOADS_DIR: path.join(shared, 'uploads'), RELEASE_VERSION: path.basename(directory) } });
        },
        healthy: async (expected) => {
          const deadline = Date.now() + 15000;
          while (Date.now() < deadline) {
            try {
              const response = await fetch(`http://127.0.0.1:${process.env.PORT || 3000}/health`, { signal: AbortSignal.timeout(1000) });
              const data = await response.json();
              if (response.ok && data.ok && data.release === expected) return true;
            } catch {}
            await setTimeout(250);
          }
          return false;
        }
      });
      activated = true;
      await execute('pm2', ['save']);
      console.log(JSON.stringify(result));
    }
  } finally {
    if (!activated) await execute('pm2', ['restart', application, '--update-env']);
  }
}