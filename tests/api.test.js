import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ContentStore } from '../src/database.js';
import { createUser, installAuthentication } from '../src/auth.js';
import { installAdminApi } from '../src/admin-api.js';

let store;
let directory;
let server;
let origin;
const password = 'test-only-long-password';
const client = () => {
  let cookie = '';
  let csrf = '';
  return {
    async request(route, method = 'GET', body, secure = true) {
      const response = await fetch(`${origin}/api/admin${route}`, { method, headers: { cookie, 'content-type': 'application/json', ...(secure ? { origin, 'x-csrf-token': csrf } : {}) }, body: body ? JSON.stringify(body) : undefined });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) cookie = cookies.map((value) => value.split(';')[0]).join('; ');
      const data = await response.json();
      if (data.csrf) csrf = data.csrf;
      return { response, data };
    },
    async login(email) { await this.request('/session'); return this.request('/login', 'POST', { email, password }); }
  };
};

before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'anchev-api-'));
  store = new ContentStore(directory);
  await createUser(store, { email: 'owner@example.com', name: 'Owner', password, role: 'owner' });
  await createUser(store, { email: 'editor@example.com', name: 'Editor', password, role: 'editor' });
  await createUser(store, { email: 'viewer@example.com', name: 'Viewer', password, role: 'viewer' });
  const app = express();
  app.use(express.json());
  installAuthentication(app, store);
  installAdminApi(app, store);
  app.use((error, _req, res, _next) => res.status(error.status || (error.name === 'ZodError' ? 400 : 500)).json({ error: error.message }));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise((resolve) => server.close(resolve)); store.close(); await rm(directory, { recursive: true, force: true }); });

test('admin APIs reject anonymous requests and legacy shared-secret headers', async () => {
  const result = await client().request('/projects');
  assert.equal(result.response.status, 401);
  const response = await fetch(`${origin}/api/admin/projects`, { headers: { 'x-admin-secret': password } });
  assert.equal(response.status, 401);
});

test('login regenerates sessions, sets HttpOnly cookies and requires CSRF', async () => {
  const browser = client();
  const login = await browser.login('owner@example.com');
  assert.equal(login.response.status, 200);
  assert.match(login.response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(login.response.headers.get('set-cookie'), /SameSite=Strict/);
  const blocked = await browser.request('/projects', 'POST', { id: 'csrf-test', name: 'Must not save' }, false);
  assert.equal(blocked.response.status, 403);
  assert.equal(store.project('csrf-test'), null);
});

test('editors can save drafts but cannot publish, delete or change settings', async () => {
  const browser = client();
  await browser.login('editor@example.com');
  const draft = await browser.request('/projects', 'POST', { id: 'editor-film', name: 'Draft film' });
  assert.equal(draft.response.status, 200);
  assert.equal(store.projects({ publicOnly: true }).some((entry) => entry.id === 'editor-film'), false);
  const forbidden = await browser.request('/projects', 'POST', { ...draft.data.saved, publish: true });
  assert.equal(forbidden.response.status, 403);
  assert.equal((await browser.request('/projects/editor-film', 'DELETE')).response.status, 403);
  assert.equal((await browser.request('/settings', 'POST', {})).response.status, 403);
});

test('publishing, draft revisions, duplicate and unpublish form a complete workflow', async () => {
  const browser = client();
  await browser.login('owner@example.com');
  let result = await browser.request('/projects', 'POST', { id: 'published-film', name: 'Public title', publish: true });
  assert.equal(result.response.status, 200);
  assert.equal(store.project('published-film', { publicOnly: true }).name, 'Public title');
  result = await browser.request('/projects', 'POST', { ...result.data.saved, name: 'Unpublished title' });
  assert.equal(result.response.status, 200);
  assert.equal(store.project('published-film', { publicOnly: true }).name, 'Public title');
  assert.equal((await browser.request('/projects/published-film/duplicate', 'POST')).data.saved.status, 'draft');
  const revisions = (await browser.request('/projects/published-film/revisions')).data.revisions;
  result = await browser.request(`/projects/published-film/revisions/${revisions[0].id}/restore`, 'POST');
  assert.equal(result.data.saved.name, 'Public title');
  assert.equal((await browser.request('/projects/published-film/unpublish', 'POST')).response.status, 200);
  assert.equal(store.project('published-film', { publicOnly: true }), null);
});

test('viewers cannot write and logout revokes access', async () => {
  const browser = client();
  await browser.login('viewer@example.com');
  assert.equal((await browser.request('/dashboard')).response.status, 200);
  assert.equal((await browser.request('/projects', 'POST', { id: 'viewer-film', name: 'Blocked' })).response.status, 403);
  await browser.request('/logout', 'POST');
  assert.equal((await browser.request('/projects')).response.status, 401);
});

test('redirects refuse external destinations, privileged routes, chains and loops', async () => {
  const browser = client();
  await browser.login('owner@example.com');
  assert.equal((await browser.request('/redirects', 'POST', { source: '/old-film', target: 'https://evil.test' })).response.status, 400);
  assert.equal((await browser.request('/redirects', 'POST', { source: '/admin', target: '/' })).response.status, 400);
  assert.equal((await browser.request('/redirects', 'POST', { source: '/old-film', target: '/work/film' })).response.status, 200);
  assert.equal((await browser.request('/redirects', 'POST', { source: '/work/film', target: '/old-film' })).response.status, 400);
});