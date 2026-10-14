import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import crypto from 'node:crypto';
import { createReadStream, constants } from 'node:fs';
import { mkdir, rename, rm, stat, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { asyncRoute, requirePermission } from './auth.js';
import { inspectUpload } from './security.js';

const execute = promisify(execFile);
const timestamp = () => new Date().toISOString();
const metadataSchema = z.object({
  alt: z.object({ en: z.string().max(300).default(''), el: z.string().max(300).default('') }).default({ en: '', el: '' }),
  title: z.string().max(200).default(''), collection: z.string().max(100).default(''),
  tags: z.array(z.string().max(60)).max(30).default([]), rights: z.string().max(500).default(''), attribution: z.string().max(300).default('')
});

export const checksum = async (filename) => {
  const hash = crypto.createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
};

export class MediaService {
  constructor(store, uploadsDir) {
    this.store = store;
    this.uploadsDir = uploadsDir;
    this.busy = false;
    this.stopping = false;
  }

  async inspect(filename, type) {
    if (type.mime.startsWith('image/')) {
      const metadata = await sharp(filename, { limitInputPixels: 40000000 }).metadata();
      if (!metadata.width || !metadata.height) throw Object.assign(new Error('Invalid image.'), { status: 415 });
      const rotated = [5, 6, 7, 8].includes(metadata.orientation);
      return { width: rotated ? metadata.height : metadata.width, height: rotated ? metadata.width : metadata.height, duration: null };
    }
    const result = await execute(process.env.FFPROBE_PATH || 'ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', filename], { timeout: 30000, maxBuffer: 1024 * 1024 });
    const metadata = JSON.parse(result.stdout);
    const stream = metadata.streams.find((entry) => entry.codec_type === 'video');
    if (!stream?.width || !stream?.height || !Number.isFinite(Number(metadata.format?.duration))) throw Object.assign(new Error('Invalid video.'), { status: 415 });
    return { width: stream.width, height: stream.height, duration: Number(metadata.format.duration) };
  }

  filename(asset) {
    if (!asset.url.startsWith('/uploads/')) throw Object.assign(new Error('This original is managed outside the upload library.'), { status: 409 });
    const relative = decodeURIComponent(asset.url.slice('/uploads/'.length));
    const resolved = path.resolve(this.uploadsDir, relative);
    if (!resolved.startsWith(`${path.resolve(this.uploadsDir)}${path.sep}`)) throw Object.assign(new Error('Invalid storage path.'), { status: 400 });
    return resolved;
  }

  async ingest(file, actorId, replacementId = null) {
    try {
      const type = await inspectUpload(file.path);
      const details = await this.inspect(file.path, type);
      const digest = await checksum(file.path);
      const duplicate = this.store.db.prepare('SELECT id FROM media WHERE checksum=?').get(digest);
      if (duplicate && !replacementId) {
        await rm(file.path, { force: true });
        return { asset: this.store.media(duplicate.id), duplicate: true };
      }
      const replacement = replacementId ? this.store.media(replacementId) : null;
      if (replacementId && !replacement) throw Object.assign(new Error('Media not found.'), { status: 404 });
      if (replacement && (!replacement.url.startsWith('/uploads/') || replacement.mime !== type.mime || ['queued', 'processing'].includes(replacement.status))) throw Object.assign(new Error('Replace a ready uploaded file with the same media format.'), { status: 409 });
      if (duplicate && duplicate.id !== replacementId) throw Object.assign(new Error('This file already exists in the library.'), { status: 409 });
      const id = replacementId || crypto.randomUUID();
      const directory = path.join(this.uploadsDir, id);
      await mkdir(directory, { recursive: true });
      const filename = replacement ? this.filename(replacement) : path.join(directory, `original.${type.ext}`);
      const bytes = (await stat(file.path)).size;
      let archive;
      if (replacement) {
        const history = path.join(this.store.directory, 'media-history', id);
        await mkdir(history, { recursive: true, mode: 0o700 });
        archive = path.join(history, `${crypto.randomUUID()}.${type.ext}`);
        await copyFile(filename, archive, constants.COPYFILE_EXCL);
        await writeFile(`${archive}.json`, JSON.stringify({ assetId: id, originalUrl: replacement.url, previousChecksum: replacement.checksum, nextChecksum: digest, actorId, createdAt: timestamp() }), { mode: 0o600, flag: 'wx' });
      }
      await rename(file.path, filename);
      const url = replacement?.url || `/uploads/${id}/original.${type.ext}`;
      try { this.store.db.transaction(() => {
        if (replacement) {
          this.store.db.prepare("UPDATE media SET bytes=?,checksum=?,width=?,height=?,duration=?,status='queued',error=NULL,updated_at=? WHERE id=?").run(bytes, digest, details.width, details.height, details.duration, timestamp(), id);
        } else {
          this.store.db.prepare('INSERT INTO media(id,url,filename,mime,bytes,checksum,width,height,duration,status,metadata,uploaded_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
            .run(id, url, path.basename(file.originalname || filename).slice(0, 250), type.mime, bytes, digest, details.width, details.height, details.duration, 'queued', JSON.stringify(metadataSchema.parse({})), actorId, timestamp(), timestamp());
        }
        this.store.db.prepare("INSERT INTO jobs(media_id,status,updated_at) VALUES (?,'queued',?) ON CONFLICT(media_id) DO UPDATE SET status='queued',attempts=0,error=NULL,updated_at=excluded.updated_at").run(id, timestamp());
        this.store.audit(actorId, replacement ? 'media.replace' : 'media.upload', 'media', id, { mime: type.mime, bytes });
      })(); } catch (error) {
        if (archive) {
          const restored = `${filename}.${crypto.randomUUID()}.restore`;
          await copyFile(archive, restored, constants.COPYFILE_EXCL);
          await rename(restored, filename);
        } else await rm(filename, { force: true });
        throw error;
      }
      return { asset: this.store.media(id), duplicate: false };
    } catch (error) {
      await rm(file.path, { force: true }).catch(() => {});
      if (['ENOENT', 'ERR_UNSUPPORTED_FORMAT'].includes(error.code)) error.status = 415;
      throw error;
    }
  }

  async derivative(asset, kind, filename, mime, width = null, height = null) {
    const url = `/uploads/${asset.id}/${path.basename(filename)}`;
    this.store.db.prepare('INSERT INTO media_derivatives(media_id,kind,url,mime,width,height,bytes) VALUES (?,?,?,?,?,?,?) ON CONFLICT(media_id,kind) DO UPDATE SET url=excluded.url,mime=excluded.mime,width=excluded.width,height=excluded.height,bytes=excluded.bytes')
      .run(asset.id, kind, url, mime, width, height, (await stat(filename)).size);
  }

  async process(asset) {
    const original = this.filename(asset);
    const directory = path.join(this.uploadsDir, asset.id);
    await mkdir(directory, { recursive: true });
    if (asset.mime.startsWith('image/')) {
      for (const width of [...new Set([480, 960, 1600].map((value) => Math.min(value, asset.width)))]) {
        for (const format of ['webp', 'avif', 'jpeg']) {
          const filename = path.join(directory, `image-${width}.${format === 'jpeg' ? 'jpg' : format}`);
          const image = sharp(original, { limitInputPixels: 40000000 }).rotate().resize({ width, withoutEnlargement: true });
          const info = await image.toFormat(format, { quality: format === 'avif' ? 65 : 85 }).toFile(filename);
          await this.derivative(asset, `image-${width}-${format}`, filename, `image/${format}`, info.width, info.height);
        }
      }
    } else {
      const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
      const run = (args) => execute(ffmpeg, ['-nostdin', '-y', '-v', 'error', '-threads', '2', ...args], { timeout: 30 * 60 * 1000, maxBuffer: 1024 * 1024 });
      for (const height of [720, 1080].filter((value) => value === 720 || asset.height > 720)) {
        const filename = path.join(directory, `film-${height}.mp4`);
        await run(['-i', original, '-map', '0:v:0', '-map', '0:a?', '-vf', `scale=w='min(${height === 720 ? 1280 : 1920},iw)':h='min(${height},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`, '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-sn', '-movflags', '+faststart', filename]);
        await this.derivative(asset, `film-${height}`, filename, 'video/mp4');
      }
      const preview = path.join(directory, 'preview.mp4');
      await run(['-i', original, '-t', '12', '-an', '-vf', "scale=w='min(960,iw)':h='min(540,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=24", '-c:v', 'libx264', '-crf', '23', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', preview]);
      await this.derivative(asset, 'preview', preview, 'video/mp4');
      const poster = path.join(directory, 'poster.jpg');
      await run(['-i', original, '-frames:v', '1', '-vf', "scale=w='min(1600,iw)':h=-2", poster]);
      await this.derivative(asset, 'poster', poster, 'image/jpeg');
    }
  }

  async processNext() {
    if (this.busy || this.stopping) return false;
    const job = this.store.db.prepare("SELECT * FROM jobs WHERE status='queued' AND attempts<3 ORDER BY id LIMIT 1").get();
    if (!job) return false;
    this.busy = true;
    this.store.db.prepare("UPDATE jobs SET status='processing',attempts=attempts+1,updated_at=? WHERE id=?").run(timestamp(), job.id);
    this.store.db.prepare("UPDATE media SET status='processing',updated_at=? WHERE id=?").run(timestamp(), job.media_id);
    try {
      await this.process(this.store.media(job.media_id));
      this.store.db.prepare("UPDATE media SET status='ready',error=NULL,updated_at=? WHERE id=?").run(timestamp(), job.media_id);
      this.store.db.prepare("UPDATE jobs SET status='ready',error=NULL,updated_at=? WHERE id=?").run(timestamp(), job.id);
      this.store.audit(null, 'media.process.complete', 'media', job.media_id);
    } catch (error) {
      const message = error.code === 'ENOENT' ? 'Original file or media processing tool is unavailable.' : 'Processing failed. Check the original and server media tools, then retry.';
      this.store.db.prepare("UPDATE media SET status='failed',error=?,updated_at=? WHERE id=?").run(message, timestamp(), job.media_id);
      this.store.db.prepare("UPDATE jobs SET status='failed',error=?,updated_at=? WHERE id=?").run(message, timestamp(), job.id);
      this.store.audit(null, 'media.process.failure', 'media', job.media_id, { code: String(error.code || 'processing') });
    } finally { this.busy = false; }
    return true;
  }

  start() {
    this.store.db.prepare("UPDATE jobs SET status='queued' WHERE status='processing'").run();
    this.store.db.prepare("UPDATE media SET status='queued' WHERE status='processing'").run();
    this.timer = setInterval(() => this.processNext().catch((error) => console.error(JSON.stringify({ event: 'media.worker', code: error.code || 'error' }))), 1500);
    this.timer.unref();
  }
  async stop() {
    this.stopping = true;
    clearInterval(this.timer);
    while (this.busy) await new Promise((resolve) => setTimeout(resolve, 100));
  }

  install(app) {
    const router = express.Router();
    const incoming = path.join(this.store.directory, 'incoming');
    const upload = multer({
      storage: multer.diskStorage({
        destination: (_req, _file, callback) => mkdir(incoming, { recursive: true }).then(() => callback(null, incoming), callback),
        filename: (_req, _file, callback) => callback(null, crypto.randomUUID())
      }),
      limits: { fileSize: 200 * 1024 * 1024, files: 1, fields: 5, parts: 6 }
    });
    router.get('/media', requirePermission('read'), (req, res) => {
      const query = String(req.query.q || '').toLowerCase().slice(0, 200);
      const page = Math.max(1, Math.min(100000, Number(req.query.page) || 1));
      const assets = this.store.db.prepare('SELECT id FROM media ORDER BY created_at DESC').all().map((row) => this.store.media(row.id)).filter((asset) => {
        return (!query || `${asset.filename} ${asset.metadata.title || ''} ${(asset.metadata.tags || []).join(' ')}`.toLowerCase().includes(query)) &&
          (!req.query.type || asset.mime.startsWith(String(req.query.type))) &&
          (!req.query.unused || asset.usage.length === 0);
      });
      res.json({ media: assets.slice((page - 1) * 30, page * 30), total: assets.length, page, pageSize: 30 });
    });
    const limiter = rateLimit({ windowMs: 60000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
    router.post('/upload', requirePermission('media'), limiter, upload.single('file'), asyncRoute(async (req, res) => {
      if (!req.file) return res.status(400).json({ error: 'Select a file.' });
      const result = await this.ingest(req.file, req.user.id);
      res.status(result.duplicate ? 200 : 201).json({ ...result, url: result.asset.url });
    }));
    router.post('/media/:id/replace', requirePermission('media'), limiter, upload.single('file'), asyncRoute(async (req, res) => {
      if (!req.file) return res.status(400).json({ error: 'Select a file.' });
      res.json(await this.ingest(req.file, req.user.id, req.params.id));
    }));
    router.patch('/media/:id', requirePermission('media'), (req, res, next) => {
      try {
        const metadata = metadataSchema.parse(req.body);
        if (!this.store.media(req.params.id)) return res.status(404).json({ error: 'Media not found.' });
        this.store.db.prepare('UPDATE media SET metadata=?,updated_at=? WHERE id=?').run(JSON.stringify(metadata), timestamp(), req.params.id);
        this.store.audit(req.user.id, 'media.metadata', 'media', req.params.id);
        res.json({ asset: this.store.media(req.params.id) });
      } catch (error) { next(error); }
    });
    router.post('/media/:id/retry', requirePermission('media'), (req, res) => {
      const asset = this.store.media(req.params.id);
      if (!asset) return res.status(404).json({ error: 'Media not found.' });
      if (asset.status !== 'failed') return res.status(409).json({ error: 'Only failed jobs can be retried.' });
      this.store.db.prepare("UPDATE jobs SET status='queued',attempts=0,error=NULL,updated_at=? WHERE media_id=?").run(timestamp(), asset.id);
      this.store.db.prepare("UPDATE media SET status='queued',error=NULL WHERE id=?").run(asset.id);
      this.store.audit(req.user.id, 'media.retry', 'media', asset.id);
      res.json({ ok: true });
    });
    router.delete('/media/:id', requirePermission('publish'), asyncRoute(async (req, res) => {
      const asset = this.store.media(req.params.id);
      if (!asset) return res.status(404).json({ error: 'Media not found.' });
      const revisions = this.store.db.prepare('SELECT document FROM revisions').all();
      const urls = [asset.url, ...asset.derivatives.map((entry) => entry.url)];
      if (asset.usage.length || revisions.some((revision) => urls.some((url) => revision.document.includes(url))) || ['processing', 'queued'].includes(asset.status)) return res.status(409).json({ error: 'This media is referenced by content or revisions, or is still processing.' });
      const original = this.filename(asset);
      await rm(original, { force: true });
      for (const derivative of asset.derivatives) await rm(this.filename({ url: derivative.url }), { force: true });
      this.store.db.transaction(() => {
        this.store.db.prepare('DELETE FROM jobs WHERE media_id=?').run(asset.id);
        this.store.db.prepare('DELETE FROM media WHERE id=?').run(asset.id);
        this.store.audit(req.user.id, 'media.delete', 'media', asset.id);
      })();
      res.json({ ok: true });
    }));
    app.use('/api/admin', router);
  }
}

export const inventoryMedia = async (store, publicDir, uploadsDir) => {
  const { readdir } = await import('node:fs/promises');
  const references = new Set();
  const fields = new Set(['thumbnail','video','preview','behindFrame','behindVideo','frames','videoSource','mobileVideoSource','showreelSource','image']);
  const visit = (value, field = '') => {
    if (typeof value === 'string' && fields.has(field) && /^(?:\/media\/|\/uploads\/|https?:\/\/)/.test(value)) references.add(value);
    else if (Array.isArray(value)) value.forEach((entry) => visit(entry, field));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, entry]) => visit(entry, key));
  };
  store.projects().forEach((project) => visit(project));
  visit(store.settings());
  const walk = async (directory, prefix) => {
    const entries = await readdir(directory, { withFileTypes: true }).catch((error) => error.code === 'ENOENT' ? [] : Promise.reject(error));
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(filename, `${prefix}/${entry.name}`);
      else if (entry.isFile() && /\.(?:jpe?g|png|webp|avif|gif|mp4|webm|mov)$/i.test(entry.name)) references.add(`${prefix}/${entry.name}`);
    }
  };
  await walk(path.join(publicDir, 'media'), '/media');
  await walk(uploadsDir, '/uploads');
  const report = { added: 0, existing: 0, missing: [], duplicates: [], files: [] };
  for (const url of references) {
    if (store.db.prepare('SELECT id FROM media WHERE url=? UNION SELECT media_id AS id FROM media_derivatives WHERE url=?').get(url, url)) { report.existing++; continue; }
    const local = url.startsWith('/');
    const filename = local ? url.startsWith('/uploads/') ? path.join(uploadsDir, url.slice(9)) : path.join(publicDir, url.slice(1)) : null;
    const info = filename ? await stat(filename).catch(() => null) : null;
    const digest = info?.isFile() ? await checksum(filename) : null;
    const duplicate = digest ? store.db.prepare('SELECT url FROM media WHERE checksum=?').get(digest) : null;
    const type = info ? await inspectUpload(filename).catch(() => null) : null;
    const dimensions = type?.mime.startsWith('image/') ? await sharp(filename, { limitInputPixels: 40000000 }).metadata().catch(() => null) : null;
    const status = !local ? 'external' : info ? 'ready' : 'missing';
    if (status === 'missing') report.missing.push(url);
    if (duplicate) report.duplicates.push({ url, original: duplicate.url });
    const id = crypto.randomUUID();
    store.db.prepare('INSERT INTO media(id,url,filename,mime,bytes,checksum,width,height,status,metadata,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, url, path.basename(url), type?.mime || 'application/octet-stream', info?.size || 0, duplicate ? null : digest, dimensions?.width || null, dimensions?.height || null, status, JSON.stringify(metadataSchema.parse({})), timestamp(), timestamp());
    report.files.push({ url, bytes: info?.size || 0, checksum: digest, status });
    report.added++;
  }
  store.projects().forEach((project) => store.syncUsage('project', project.id, project, store.project(project.id, { publicOnly: true })));
  store.syncUsage('settings', 'site', store.settings());
  store.audit(null, 'media.inventory', 'migration', 'media', { added: report.added, missing: report.missing.length, duplicates: report.duplicates.length });
  return report;
};