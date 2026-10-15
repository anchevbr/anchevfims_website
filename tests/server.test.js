import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ContentStore } from '../src/database.js';
import { createUser } from '../src/auth.js';

let directory;
let child;
let origin;
let cookie;
let csrf;
const password = 'test-only-server-password';

before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'anchev-server-'));
  await writeFile(path.join(directory, 'projects.json'), JSON.stringify([{ id: 'kept-url', name: 'Published original', note: 'Film made in Athens', frames: [] }]));
  const store = new ContentStore(directory);
  store.importJson();
  await createUser(store, { email: 'owner@example.com', name: 'Owner', role: 'owner', password });
  store.close();
  child = fork('server.js', [], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'test', PORT: '0', DATA_DIR: directory, UPLOADS_DIR: path.join(directory, 'uploads'), SESSION_SECRET: 'test-only-session-secret-with-enough-length', MEDIA_WORKER: '0', PODCAST_FEED_URL: 'http://127.0.0.1:1/unavailable' }, silent: true });
  let errors = '';
  child.stderr.on('data', (value) => { errors += value; });
  const message = await Promise.race([once(child, 'message'), once(child, 'exit').then(() => { throw new Error(errors || 'Server exited before readiness.'); })]);
  origin = `http://127.0.0.1:${message[0].port}`;
  const response = await fetch(`${origin}/api/admin/session`);
  csrf = (await response.json()).csrf;
  cookie = response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
  const login = await fetch(`${origin}/api/admin/login`, { method: 'POST', headers: { cookie, origin, 'x-csrf-token': csrf, 'content-type': 'application/json' }, body: JSON.stringify({ email: 'owner@example.com', password }) });
  assert.equal(login.status, 200);
  csrf = (await login.json()).csrf;
  cookie = login.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
});
after(async () => { child.kill('SIGTERM'); await once(child, 'exit'); await rm(directory, { recursive: true, force: true }); });

test('live server has nonce CSP, security headers, health and private API controls', async () => {
  const response = await fetch(`${origin}/`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.match(response.headers.get('content-security-policy'), /nonce-/);
  const html = await response.text();
  assert.match(html, /<script nonce="[^"]+"/);
  assert.match(html, /Published original/);
  assert.equal((await fetch(`${origin}/api/admin/projects`)).status, 401);
  assert.equal((await fetch(`${origin}/health`)).status, 200);
  assert.equal((await fetch(`${origin}/api/nonexistent`)).status, 404);
});

test('drafts never appear in public API, sitemap or project routes', async () => {
  const saved = await fetch(`${origin}/api/admin/projects`, { method: 'POST', headers: { cookie, origin, 'x-csrf-token': csrf, 'content-type': 'application/json' }, body: JSON.stringify({ id: 'private-draft', name: 'Never public' }) });
  assert.equal(saved.status, 200);
  const projects = await (await fetch(`${origin}/api/projects`)).json();
  assert.equal(projects.projects.some((project) => project.id === 'private-draft'), false);
  assert.equal((await fetch(`${origin}/work/private-draft`)).status, 404);
  const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
  assert.equal(sitemap.includes('/work/private-draft'), false);
  assert.ok(sitemap.includes('/work/kept-url'));
});

test('disguised active content is rejected by the real multipart upload endpoint', async () => {
  const body = new FormData();
  body.append('file', new Blob(['<html><script>alert(1)</script></html>'], { type: 'image/jpeg' }), 'evil.html');
  const response = await fetch(`${origin}/api/admin/upload`, { method: 'POST', headers: { cookie, origin, 'x-csrf-token': csrf }, body });
  assert.equal(response.status, 415);
});

test('contact submissions validate consent and persist real inquiries', async () => {
  const body = { name: 'Test person', email: 'test@example.com', message: 'We would like to discuss a film production.', privacy: true };
  const accepted = await fetch(`${origin}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal(accepted.status, 201);
  const rejected = await fetch(`${origin}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, privacy: false }) });
  assert.equal(rejected.status, 400);
  const inbox = await (await fetch(`${origin}/api/admin/inquiries`, { headers: { cookie } })).json();
  assert.equal(inbox.inquiries.length, 1);
});

const adminPost = (route, body) => fetch(`${origin}/api/admin/${route}`, { method: 'POST', headers: { cookie, origin, 'x-csrf-token': csrf, 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('Greek homepage has self-canonical metadata and untranslated projects have no Greek route', async () => {
  const response = await fetch(`${origin}/el/`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<html lang="el">/);
  assert.ok(html.includes(`rel="canonical" href="${origin}/el/"`));
  assert.match(html, /Ονοματεπώνυμο/);
  assert.equal((await fetch(`${origin}/el/work/kept-url`)).status, 404);
  const english = await (await fetch(`${origin}/work/kept-url`)).text();
  assert.equal(english.includes('href="/el/work/kept-url"'), false);
});

test('reviewed project translations publish with reciprocal metadata and SEO overrides', async () => {
  const response = await adminPost('projects', { id: 'translated-film', name: 'English film', note: 'An English film description', publish: true, seo: { title: 'Custom film title', description: 'An approved search description.' }, translations: { el: { name: 'Ελληνική ταινία', note: 'Περιγραφή της ταινίας στα ελληνικά.', ready: true } } });
  assert.equal(response.status, 200);
  const english = await (await fetch(`${origin}/work/translated-film`)).text();
  assert.match(english, /<title>Custom film title<\/title>/);
  assert.match(english, /hreflang="el"/);
  const greek = await fetch(`${origin}/el/work/translated-film`);
  assert.equal(greek.status, 200);
  assert.match(await greek.text(), /Ελληνική ταινία/);
  const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
  assert.ok(sitemap.includes('/el/work/translated-film'));
});

test('custom page drafts stay private and published pages and redirects resolve', async () => {
  const draft = { id: 'production-guide', locale: 'en', heading: 'Production guide', body: 'A real published content block.', blocks: [{ type: 'text', title: 'Planning', text: 'Define the brief before filming.' }] };
  const saved = await adminPost('pages', draft);
  assert.equal(saved.status, 200);
  assert.equal((await fetch(`${origin}/pages/production-guide`)).status, 404);
  const page = (await saved.json()).saved;
  assert.equal((await adminPost('pages', { ...page, publish: true })).status, 200);
  const published = await fetch(`${origin}/pages/production-guide`);
  assert.equal(published.status, 200);
  const html = await published.text();
  assert.match(html, /Define the brief before filming/);
  assert.equal(html.includes('href="/el/pages/production-guide"'), false);
  assert.equal((await adminPost('redirects', { source: '/old-production-guide', target: '/pages/production-guide' })).status, 200);
  const redirect = await fetch(`${origin}/old-production-guide?source=legacy`, { redirect: 'manual' });
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get('location'), '/pages/production-guide?source=legacy');
  assert.equal((await fetch(`${origin}/privacy`)).status, 200);
  assert.equal((await fetch(`${origin}/el/privacy`)).status, 200);
});

test('page previews are authenticated, noindexed and contain saved drafts rather than public content', async () => {
  const initial = await adminPost('pages', { id: 'preview-page', locale: 'en', heading: 'Public heading', body: 'Published body', publish: true });
  const saved = (await initial.json()).saved;
  assert.equal((await adminPost('pages', { ...saved, heading: 'Private preview heading', body: '<script>not executable</script>' })).status, 200);
  const route = `${origin}/api/admin/pages/en/preview-page/preview.html`;
  assert.equal((await fetch(route)).status, 401);
  const preview = await fetch(route, { headers: { cookie } });
  assert.equal(preview.status, 200);
  assert.match(preview.headers.get('x-robots-tag'), /noindex/);
  assert.match(preview.headers.get('content-security-policy'), /frame-ancestors 'self'/);
  const html = await preview.text();
  assert.match(html, /Private preview heading/);
  assert.equal(html.includes('<script>not executable</script>'), false);
  const published = await (await fetch(`${origin}/pages/preview-page`)).text();
  assert.match(published, /Public heading/);
  assert.equal(published.includes('Private preview heading'), false);
});