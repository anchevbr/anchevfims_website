import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as OTPAuth from 'otpauth';
import { ContentStore } from '../src/database.js';
import { createUser, installAuthentication } from '../src/auth.js';
import { installAdminApi } from '../src/admin-api.js';

let store;
let directory;
let server;
let origin;
const password = 'test-only-long-password';
const previousMfaKey = process.env.MFA_ENCRYPTION_KEY;
const client = () => {
  let cookie = '';
  let csrf = '';
  return {
    async request(route, method = 'GET', body, secure = true, headers = {}) {
      const response = await fetch(`${origin}/api/admin${route}`, { method, headers: { cookie, 'content-type': 'application/json', ...(secure ? { origin, 'x-csrf-token': csrf } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) cookie = cookies.map((value) => value.split(';')[0]).join('; ');
      const data = await response.json();
      if (data.csrf) csrf = data.csrf;
      return { response, data };
    },
    async login(email) { await this.request('/session'); return this.request('/login', 'POST', { email, password }); }
  };
};
const ownerClient = client();

before(async () => {
  process.env.MFA_ENCRYPTION_KEY = 'test-only-mfa-encryption-key-long-enough';
  directory = await mkdtemp(path.join(tmpdir(), 'anchev-api-'));
  store = new ContentStore(directory);
  await createUser(store, { email: 'owner@example.com', name: 'Owner', password, role: 'owner' });
  await createUser(store, { email: 'editor@example.com', name: 'Editor', password, role: 'editor' });
  await createUser(store, { email: 'viewer@example.com', name: 'Viewer', password, role: 'viewer' });
  await createUser(store, { email: 'mfa@example.com', name: 'MFA owner', password, role: 'owner' });
  const app = express();
  app.use(express.json());
  installAuthentication(app, store);
  installAdminApi(app, store);
  app.use((error, _req, res, _next) => res.status(error.status || (error.name === 'ZodError' ? 400 : 500)).json({ error: error.message }));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  await ownerClient.login('owner@example.com');
});
after(async () => {
  await new Promise((resolve) => server.close(resolve)); store.close(); await rm(directory, { recursive: true, force: true });
  if (previousMfaKey === undefined) delete process.env.MFA_ENCRYPTION_KEY;
  else process.env.MFA_ENCRYPTION_KEY = previousMfaKey;
});

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
  const malformed = await browser.request('/projects', 'POST', { id: 'csrf-test', name: 'Must not save' }, true, { 'x-csrf-token': 'é'.repeat(64) });
  assert.equal(malformed.response.status, 403);
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
  const browser = ownerClient;
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
  const browser = ownerClient;
  assert.equal((await browser.request('/redirects', 'POST', { source: '/old-film', target: 'https://evil.test' })).response.status, 400);
  assert.equal((await browser.request('/redirects', 'POST', { source: '/admin', target: '/' })).response.status, 400);
  assert.equal((await browser.request('/redirects', 'POST', { source: '/old-film', target: '/work/film' })).response.status, 200);
  assert.equal((await browser.request('/redirects', 'POST', { source: '/work/film', target: '/old-film' })).response.status, 400);
});

test('MFA encrypts seeds, rejects replay and consumes recovery codes only once', async () => {
  const browser = client();
  await browser.login('mfa@example.com');
  const setup = await browser.request('/mfa/setup', 'POST', { password });
  assert.equal(setup.response.status, 200);
  const generator = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(setup.data.secret), period: 30, digits: 6 });
  const token = generator.generate();
  const confirmed = await browser.request('/mfa/confirm', 'POST', { token });
  assert.equal(confirmed.response.status, 200);
  const user = store.db.prepare('SELECT * FROM users WHERE email=?').get('mfa@example.com');
  assert.notEqual(user.mfa_secret, setup.data.secret);
  assert.equal(user.mfa_recovery.includes(confirmed.data.recoveryCodes[0]), false);
  await browser.request('/logout', 'POST');
  const replay = client();
  await replay.request('/session');
  assert.equal((await replay.request('/login', 'POST', { email: 'mfa@example.com', password, token })).response.status, 401);
  const recovered = client();
  await recovered.request('/session');
  assert.equal((await recovered.request('/login', 'POST', { email: 'mfa@example.com', password, token: confirmed.data.recoveryCodes[0] })).response.status, 200);
  const reused = client();
  await reused.request('/session');
  assert.equal((await reused.request('/login', 'POST', { email: 'mfa@example.com', password, token: confirmed.data.recoveryCodes[0] })).response.status, 401);
  assert.equal((await recovered.request('/mfa/disable', 'POST', { password, token: confirmed.data.recoveryCodes[1] })).response.status, 200);
  assert.equal(store.db.prepare('SELECT mfa_secret FROM users WHERE id=?').get(user.id).mfa_secret, null);
});

test('activity records are readable and pagination advances safely', async () => {
  const browser = ownerClient;
  const first = await browser.request('/activity');
  assert.equal(first.response.status, 200);
  assert.ok(first.data.activity.length);
  const next = await browser.request('/activity?offset=1');
  assert.equal(next.response.status, 200);
  assert.notEqual(next.data.activity[0].id, first.data.activity[0].id);
});

test('page lifecycle preserves public snapshots, checks versions and restores revisions only as drafts', async () => {
  const browser = ownerClient;
  let result = await browser.request('/pages', 'POST', { id: 'page-workflow', locale: 'en', heading: 'Published heading', body: 'Public page content.', publish: true });
  assert.equal(result.response.status, 200);
  const original = result.data.saved;
  result = await browser.request('/pages', 'POST', { ...original, heading: 'Private draft heading' });
  assert.equal(result.response.status, 200);
  assert.equal(store.page('page-workflow', 'en', true).heading, 'Published heading');
  const revisions = (await browser.request('/pages/en/page-workflow/revisions')).data.revisions;
  const route = `/pages/en/page-workflow/revisions/${revisions[0].id}/restore`;
  assert.equal((await browser.request(route, 'POST', { version: original.version })).response.status, 409);
  result = await browser.request(route, 'POST', { version: result.data.saved.version });
  assert.equal(result.response.status, 200);
  assert.equal(result.data.saved.heading, 'Published heading');
  assert.equal((await browser.request('/pages/en/page-workflow/unpublish', 'POST', { version: result.data.saved.version })).response.status, 200);
  assert.equal(store.page('page-workflow', 'en', true), null);
  assert.equal((await browser.request('/pages/en/page-workflow', 'DELETE', { version: store.page('page-workflow').version })).response.status, 200);
  assert.equal(store.page('page-workflow'), null);
  assert.ok(store.db.prepare("SELECT count(*) AS total FROM revisions WHERE entity_type='page' AND entity_id='en:page-workflow'").get().total >= 3);
});