import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { ContentStore } from '../src/database.js';

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