import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdtemp, mkdir, rm, writeFile, stat, readdir } from 'node:fs/promises';
import express from 'express';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ContentStore } from '../src/database.js';
import { MediaService, checksum } from '../src/media.js';

const execute = promisify(execFile);

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

test('real video processing produces a web film, silent preview and poster without changing the original', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'anchev-video-'));
  const store = new ContentStore(directory);
  const service = new MediaService(store, path.join(directory, 'uploads'));
  try {
    const source = path.join(directory, 'fixture.mp4');
    await execute(process.env.FFMPEG_PATH || 'ffmpeg', ['-nostdin', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=24', '-t', '1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', source]);
    const { asset } = await service.ingest({ path: source, originalname: 'fixture.mp4' }, null);
    await service.processNext();
    const ready = store.media(asset.id);
    assert.equal(ready.status, 'ready', ready.error);
    assert.deepEqual(ready.derivatives.map((entry) => entry.kind).sort(), ['film-720', 'poster', 'preview']);
    assert.equal(await checksum(service.filename(ready)), asset.checksum);
    const preview = ready.derivatives.find((entry) => entry.kind === 'preview');
    const { stdout } = await execute(process.env.FFPROBE_PATH || 'ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', service.filename({ url: preview.url })]);
    assert.equal(JSON.parse(stdout).streams.some((stream) => stream.codec_type === 'audio'), false);
  } finally { await service.stop(); store.close(); await rm(directory, { recursive: true, force: true }); }
});

test('replacement preserves previous originals and rolls back files when a database save fails', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'anchev-replacement-'));
  const store = new ContentStore(directory);
  const service = new MediaService(store, path.join(directory, 'uploads'));
  try {
    const source = path.join(directory, 'fixture.png');
    const image = (background) => sharp({ create: { width: 32, height: 24, channels: 3, background } }).png().toFile(source);
    await image('#cc3311');
    const { asset } = await service.ingest({ path: source, originalname: 'first.png' }, null);
    await service.processNext();
    await image('#1122cc');
    const replaced = await service.ingest({ path: source, originalname: 'replacement.png' }, null, asset.id);
    assert.equal(replaced.asset.url, asset.url);
    const history = path.join(directory, 'media-history', asset.id);
    const archived = (await readdir(history)).find((filename) => filename.endsWith('.png'));
    assert.equal(await checksum(path.join(history, archived)), asset.checksum);
    await service.processNext();
    const digest = replaced.asset.checksum;
    store.db.exec("CREATE TRIGGER reject_replacement BEFORE UPDATE ON media BEGIN SELECT RAISE(ABORT,'fixture failure'); END");
    await image('#11cc22');
    await assert.rejects(service.ingest({ path: source, originalname: 'failed.png' }, null, asset.id), /fixture failure/);
    assert.equal(await checksum(service.filename(asset)), digest);
    assert.equal(store.media(asset.id).checksum, digest);
  } finally { await service.stop(); store.close(); await rm(directory, { recursive: true, force: true }); }
});

test('historical derivative references prevent media deletion', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'anchev-reference-'));
  const store = new ContentStore(directory);
  const service = new MediaService(store, path.join(directory, 'uploads'));
  let server;
  try {
    const source = path.join(directory, 'fixture.png');
    await sharp({ create: { width: 32, height: 24, channels: 3, background: '#22cc44' } }).png().toFile(source);
    const { asset } = await service.ingest({ path: source, originalname: 'fixture.png' }, null);
    await service.processNext();
    const ready = store.media(asset.id);
    store.db.prepare('INSERT INTO revisions(entity_type,entity_id,document,created_at) VALUES (?,?,?,?)').run('project', 'old-film', JSON.stringify({ thumbnail: ready.derivatives[0].url }), new Date().toISOString());
    const app = express();
    app.use((req, _res, next) => { req.user = { role: 'owner', id: null }; next(); });
    service.install(app);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/media/${asset.id}`, { method: 'DELETE' });
    assert.equal(response.status, 409);
    assert.equal(await checksum(service.filename(asset)), asset.checksum);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await service.stop(); store.close(); await rm(directory, { recursive: true, force: true });
  }
});