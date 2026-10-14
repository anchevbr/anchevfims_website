import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readlink, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ContentStore } from '../src/database.js';
import { backupStorage, verifyBackup, switchRelease } from '../src/operations.js';

test('deployment refuses unspecified environments before any remote operation', () => {
  const result = spawnSync('bash', ['scripts/deploy.sh'], { env: { PATH: process.env.PATH }, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Set DEPLOY_ENV/);
  const activation = spawnSync(process.execPath, ['scripts/release.mjs', 'activate', '/tmp/never-a-real-release', 'fixture'], { env: { PATH: process.env.PATH }, encoding: 'utf8' });
  assert.notEqual(activation.status, 0);
  assert.match(activation.stderr, /Explicit RELEASE_APPROVED/);
});

test('offline backups retain database, JSON and media and detect damaged copies', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'anchev-backup-'));
  const dataDir = path.join(root, 'data');
  const uploadsDir = path.join(root, 'uploads');
  await mkdir(uploadsDir);
  await writeFile(path.join(uploadsDir, 'original.bin'), 'original-media-fixture');
  const store = new ContentStore(dataDir);
  store.saveProject({ id: 'backup-film', name: 'Preserved production', status: 'draft' }, null);
  store.close();
  await writeFile(path.join(dataDir, 'settings.json'), '{"preserved":true}');
  try {
    const backupDir = path.join(root, 'snapshot');
    const manifest = await backupStorage({ dataDir, uploadsDir, backupDir });
    assert.equal(manifest.files.length, 3);
    assert.equal((await verifyBackup(backupDir)).version, 1);
    const restored = new ContentStore(path.join(backupDir, 'data'));
    assert.equal(restored.project('backup-film').name, 'Preserved production');
    restored.close();
    await writeFile(path.join(backupDir, 'uploads', 'original.bin'), 'damaged');
    await assert.rejects(verifyBackup(backupDir), /checksum failed/);
    await assert.rejects(backupStorage({ dataDir, uploadsDir, backupDir: path.join(dataDir, 'unsafe') }), /outside live storage/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('release switch is atomic and restores a healthy previous release after failure', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'anchev-release-'));
  await mkdir(path.join(root, 'releases', 'old'), { recursive: true });
  await mkdir(path.join(root, 'releases', 'new'));
  await symlink('releases/old', path.join(root, 'current'));
  const restarts = [];
  try {
    await assert.rejects(switchRelease({ root, release: 'new', restart: async (directory) => restarts.push(path.basename(directory)), healthy: async (release) => release === 'old' }), /previous release was restored/);
    assert.equal(await readlink(path.join(root, 'current')), 'releases/old');
    assert.deepEqual(restarts, ['new', 'old']);
    const result = await switchRelease({ root, release: 'new', restart: async () => {}, healthy: async () => true });
    assert.equal(result.previous, 'old');
    assert.equal(await readlink(path.join(root, 'current')), path.join(root, 'releases', 'new'));
    await assert.rejects(switchRelease({ root, release: '../outside', restart: async () => {}, healthy: async () => true }), /Invalid release/);
  } finally { await rm(root, { recursive: true, force: true }); }
});