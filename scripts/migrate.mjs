import { mkdir, copyFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ContentStore } from '../src/database.js';
import { inventoryMedia } from '../src/media.js';

const directory = path.resolve(process.env.DATA_DIR || 'data');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = path.join(directory, 'backups', `legacy-${stamp}`);
await mkdir(backup, { recursive: true, mode: 0o700 });
for (const file of await readdir(directory)) {
  if (file.endsWith('.json')) await copyFile(path.join(directory, file), path.join(backup, file));
}
const store = new ContentStore(directory);
try {
  const report = {
    backup, content: store.importJson(), media: await inventoryMedia(store, path.resolve('public'), path.resolve(process.env.UPLOADS_DIR || 'public/uploads')),
    integrity: store.db.pragma('integrity_check', { simple: true }),
    foreignKeys: store.db.pragma('foreign_key_check'), schema: store.db.pragma('user_version', { simple: true })
  };
  if (report.integrity !== 'ok' || report.foreignKeys.length) throw new Error('Database integrity check failed. Originals and backups remain unchanged.');
  await mkdir(path.join(directory, 'reports'), { recursive: true, mode: 0o700 });
  const output = path.join(directory, 'reports', `migration-${stamp}.json`);
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ report: output, backup, content: report.content, mediaAdded: report.media.added, missing: report.media.missing.length, duplicates: report.media.duplicates.length, integrity: report.integrity }, null, 2));
} finally { store.close(); }