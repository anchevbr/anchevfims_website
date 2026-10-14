import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdtemp, mkdir, rm, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ContentStore } from '../src/database.js';
import { MediaService, checksum } from '../src/media.js';

test('images are validated, deduplicated, processed and retain originals', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'anchev-media-'));
  const store = new ContentStore(directory);
  const service = new MediaService(store, path.join(directory, 'uploads'));
  try {
    const source = path.join(directory, 'image');
    await sharp({ create: { width: 1100, height: 600, channels: 3, background: '#b8412e' } }).png().toFile(source);
    const first = await service.ingest({ path: source, originalname: '../../unsafe.html' }, null);
    assert.equal(first.asset.mime, 'image/png');
    assert.ok(first.asset.url.endsWith('/original.png'));
    assert.equal(first.asset.width, 1100);
    const digest = first.asset.checksum;
    await service.processNext();
    const ready = store.media(first.asset.id);
    assert.equal(ready.status, 'ready');
    assert.equal(ready.derivatives.length, 9);
    assert.equal(await checksum(service.filename(ready)), digest);
    await sharp(service.filename(ready)).toFile(source);
    const duplicate = await service.ingest({ path: source, originalname: 'duplicate.png' }, null);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.asset.id, ready.id);
    assert.throws(() => service.filename({ url: '/uploads/../../secret' }), { status: 400 });
  } finally { await service.stop(); store.close(); await rm(directory, { recursive: true, force: true }); }
});

test('spoofed and corrupt media never reaches public storage', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'anchev-media-invalid-'));
  const store = new ContentStore(directory);
  const service = new MediaService(store, path.join(directory, 'uploads'));
  try {
    await mkdir(path.join(directory, 'incoming'));
    const source = path.join(directory, 'incoming', 'fake.jpg');
    await writeFile(source, '<script>alert(1)</script>');
    await assert.rejects(service.ingest({ path: source, originalname: 'fake.jpg' }, null), { status: 415 });
    assert.equal(store.db.prepare('SELECT count(*) AS total FROM media').get().total, 0);
    await assert.rejects(stat(source), { code: 'ENOENT' });
  } finally { await service.stop(); store.close(); await rm(directory, { recursive: true, force: true }); }
});