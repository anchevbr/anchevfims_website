import Database from 'better-sqlite3';
import { mkdir, cp, readdir, readFile, writeFile, lstat, readlink, symlink, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { checksum } from './media.js';

const files = async (directory) => {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Backup storage must not contain symbolic links.');
    if (entry.isDirectory()) result.push(...await files(filename));
    else if (entry.isFile()) result.push(filename);
  }
  return result;
};

export const verifyBackup = async (directory) => {
  const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
  for (const entry of manifest.files) {
    const filename = path.resolve(directory, entry.path);
    if (!filename.startsWith(`${path.resolve(directory)}${path.sep}`)) throw new Error('Invalid backup path.');
    if (await checksum(filename) !== entry.sha256) throw new Error(`Backup checksum failed: ${entry.path}`);
  }
  const database = new Database(path.join(directory, 'data', 'content.sqlite'), { readonly: true });
  try {
    if (database.pragma('integrity_check', { simple: true }) !== 'ok' || database.pragma('foreign_key_check').length) throw new Error('Backup database integrity failed.');
  } finally { database.close(); }
  return manifest;
};

export const backupStorage = async ({ dataDir, uploadsDir, backupDir }) => {
  const source = path.resolve(dataDir);
  const uploads = path.resolve(uploadsDir);
  const destination = path.resolve(backupDir);
  if ([source, uploads].some((directory) => destination === directory || destination.startsWith(`${directory}${path.sep}`))) throw new Error('Backups must be outside live storage.');
  await mkdir(destination, { recursive: false, mode: 0o700 });
  await mkdir(path.join(destination, 'data'), { mode: 0o700 });
  const database = new Database(path.join(source, 'content.sqlite'), { readonly: true });
  try { await database.backup(path.join(destination, 'data', 'content.sqlite')); }
  finally { database.close(); }
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.json')) await cp(path.join(source, entry.name), path.join(destination, 'data', entry.name));
    if (entry.isDirectory() && entry.name === 'media-history') await cp(path.join(source, entry.name), path.join(destination, 'data', entry.name), { recursive: true, dereference: false, errorOnExist: true, force: false });
  }
  await cp(uploads, path.join(destination, 'uploads'), { recursive: true, dereference: false, errorOnExist: true, force: false });
  const entries = await files(destination);
  const manifest = { version: 1, createdAt: new Date().toISOString(), files: await Promise.all(entries.map(async (filename) => ({ path: path.relative(destination, filename), sha256: await checksum(filename) }))) };
  await writeFile(path.join(destination, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  await verifyBackup(destination);
  return manifest;
};

export const switchRelease = async ({ root, release, restart, healthy }) => {
  if (!/^[a-zA-Z0-9_-]+$/.test(release)) throw new Error('Invalid release identifier.');
  const releases = path.resolve(root, 'releases');
  const candidate = path.join(releases, release);
  if (!(await lstat(candidate)).isDirectory() || (await lstat(candidate)).isSymbolicLink()) throw new Error('Release must be a real prepared directory.');
  const current = path.resolve(root, 'current');
  if (!(await lstat(current)).isSymbolicLink()) throw new Error('Current must already be a release symlink; initial production conversion requires operator setup.');
  const previous = await readlink(current);
  const previousPath = path.resolve(root, previous);
  if (path.dirname(previousPath) !== releases || !(await lstat(previousPath)).isDirectory()) throw new Error('Previous release must be retained inside releases.');
  if (previousPath === candidate) throw new Error('That release is already active.');
  const replace = async (target) => {
    const temporary = `${current}.${crypto.randomUUID()}.tmp`;
    try { await symlink(target, temporary); await rename(temporary, current); }
    finally { await rm(temporary, { force: true }); }
  };
  await replace(candidate);
  try {
    await restart(candidate);
    if (!await healthy(release)) throw new Error('Candidate health check failed.');
    return { release, previous: path.basename(previousPath) };
  } catch (failure) {
    await replace(previous);
    await restart(previousPath);
    if (!await healthy(path.basename(previousPath))) throw new Error('Rollback health check failed; operator intervention is required.', { cause: failure });
    throw new Error('Activation failed; the previous release was restored and passed health checks.', { cause: failure });
  }
};