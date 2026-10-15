import { mkdtemp, readdir, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fork } from 'node:child_process';
import crypto from 'node:crypto';
import { ContentStore } from '../src/database.js';
import { createUser } from '../src/auth.js';
import { inventoryMedia } from '../src/media.js';

if (process.env.NODE_ENV === 'production') throw new Error('The test preview must never run in production.');
const directory = process.env.PREVIEW_DATA_DIR || await mkdtemp(path.join(tmpdir(), 'anchev-preview-'));
for (const file of await readdir('data')) {
  if (file.endsWith('.json')) await copyFile(path.join('data', file), path.join(directory, file));
}
const store = new ContentStore(directory);
store.importJson();
if (!store.db.prepare('SELECT id FROM users LIMIT 1').get()) await createUser(store, { email: 'preview@example.invalid', name: 'Preview owner', role: 'owner', password: 'local-preview-only-password' });
await inventoryMedia(store, path.resolve('public'), path.join(directory, 'uploads'));
store.close();
const child = fork('server.js', [], { env: { ...process.env, NODE_ENV: 'development', PORT: process.env.PORT || '3011', HOST: '127.0.0.1', DATA_DIR: directory, UPLOADS_DIR: path.join(directory, 'uploads'), SESSION_SECRET: crypto.randomBytes(48).toString('hex'), MFA_ENCRYPTION_KEY: crypto.randomBytes(48).toString('hex') }, stdio: ['inherit', 'inherit', 'inherit', 'ipc'] });
child.on('exit', (code) => process.exit(code || 0));
process.once('SIGINT', () => child.kill('SIGINT'));
process.once('SIGTERM', () => child.kill('SIGTERM'));
console.log('Isolated preview uses test-only account preview@example.invalid / local-preview-only-password.');
console.log(`Preview content directory: ${directory}`);