import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { ContentStore, parseInquiryRetentionDays } from '../src/database.js';

const fixture = async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'anchev-content-'));
  const legacy = [{ id: 'original-url', name: 'Original film', thumbnail: '/media/original.jpg', frames: [] }];
  await writeFile(path.join(directory, 'projects.json'), JSON.stringify(legacy));
  const store = new ContentStore(directory);
  return { directory, store, cleanup: async () => { store.close(); await rm(directory, { recursive: true, force: true }); } };
};

test('legacy import is transactional, repeatable and preserves original files and URLs', async () => {
  const { store, directory, cleanup } = await fixture();
  try {
    assert.equal(store.importJson().projects, 1);
    assert.equal(store.importJson().skipped, true);
    assert.equal(store.projects({ publicOnly: true })[0].id, 'original-url');
    assert.equal(JSON.parse(await readFile(path.join(directory, 'projects.json'), 'utf8'))[0].name, 'Original film');
    assert.equal(store.db.pragma('integrity_check', { simple: true }), 'ok');
  } finally { await cleanup(); }
});

test('draft edits never leak into published content and stale saves conflict', async () => {
  const { store, cleanup } = await fixture();
  try {
    store.importJson();
    const original = store.project('original-url');
    const changed = store.saveProject({ ...original, name: 'Private draft' }, null);
    assert.equal(store.project('original-url', { publicOnly: true }).name, 'Original film');
    assert.equal(changed.name, 'Private draft');
    assert.throws(() => store.saveProject(original, null), { status: 409 });
    store.saveProject(changed, null, true);
    assert.equal(store.project('original-url', { publicOnly: true }).name, 'Private draft');
    assert.equal(store.db.prepare('SELECT count(*) AS total FROM revisions').get().total, 2);
  } finally { await cleanup(); }
});

test('unfinished Greek translations are not public and deletion retains revisions', async () => {
  const { store, cleanup } = await fixture();
  try {
    store.importJson();
    let project = store.project('original-url');
    project = store.saveProject({ ...project, translations: { el: { name: 'Greek draft', ready: false } } }, null, true);
    assert.equal(project.hasGreek, false);
    project = store.saveProject({ ...project, translations: { el: { name: 'Approved Greek', ready: true } } }, null, true);
    assert.equal(store.project(project.id, { publicOnly: true, locale: 'el' }).name, 'Approved Greek');
    assert.equal(store.deleteProject(project.id, null), true);
    assert.equal(store.projects().length, 0);
    assert.ok(store.db.prepare('SELECT count(*) AS total FROM revisions').get().total > 0);
  } finally { await cleanup(); }
});

test('inquiry retention runs at startup and hourly without inbox access', async (context) => {
  const { store, cleanup } = await fixture();
  const timestamp = Date.parse('2026-10-15T12:00:00Z');
  context.mock.timers.enable({ apis: ['Date', 'setInterval'], now: timestamp });
  try {
    const insert = store.db.prepare('INSERT INTO inquiries(id,name,email,message,locale,created_at) VALUES (?,?,?,?,?,?)');
    const cutoff = timestamp - store.inquiryRetentionDays * 86400000;
    insert.run('expired', 'Private name', 'person@example.invalid', 'Private message', 'en', new Date(cutoff - 1).toISOString());
    insert.run('boundary', 'Private name', 'person@example.invalid', 'Private message', 'en', new Date(cutoff).toISOString());
    insert.run('recent', 'Private name', 'person@example.invalid', 'Private message', 'en', new Date(timestamp).toISOString());
    store.startInquiryRetention();
    assert.deepEqual(store.db.prepare('SELECT id FROM inquiries ORDER BY id').all().map((entry) => entry.id), ['boundary', 'recent']);
    context.mock.timers.tick(3600000);
    assert.deepEqual(store.db.prepare('SELECT id FROM inquiries').all().map((entry) => entry.id), ['recent']);
  } finally { await cleanup(); }
});

test('inquiry retention configuration rejects invalid or unbounded durations', () => {
  assert.equal(parseInquiryRetentionDays(''), 90);
  assert.equal(parseInquiryRetentionDays('30'), 30);
  for (const value of ['NaN', '0', '-1', '1.5', '3651', 'Infinity']) assert.throws(() => parseInquiryRetentionDays(value), /INQUIRY_RETENTION_DAYS/);
});