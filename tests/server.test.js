import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ContentStore } from '../src/database.js';
import { createUser } from '../src/auth.js';
import { load } from 'cheerio';
import sharp from 'sharp';
import { MediaService } from '../src/media.js';

let directory;
let child;
let origin;
let cookie;
let csrf;
const password = 'test-only-server-password';

test('homepage settings control localized copy, social metadata and indexing without affecting inner pages', async () => {
  const headers = { cookie, origin, 'x-csrf-token': csrf, 'content-type': 'application/json' };
  const original = await (await fetch(`${origin}/api/admin/settings`, { headers: { cookie } })).json();
  try {
    const response = await fetch(`${origin}/api/admin/settings`, { method: 'POST', headers, body: JSON.stringify({ ...original, homepage: { en: { heroPositioning: 'Custom English positioning' }, el: { heroPositioning: 'Custom Greek positioning' } }, seo: { title: 'Custom homepage title', description: 'A custom homepage description.', image: '/assets/anchevlogo.png', noindex: true } }) });
    assert.equal(response.status, 200);
    const draft = await response.json();
    assert.equal((await fetch(`${origin}/api/settings`)).status, 200);
    assert.equal((await (await fetch(`${origin}/api/settings`)).json()).homepage?.en?.heroPositioning, original.homepage?.en?.heroPositioning);
    const previewUrl = `${origin}/api/admin/settings/preview.html?version=${draft.version}`;
    assert.equal((await fetch(previewUrl)).status, 401);
    assert.equal((await fetch(`${previewUrl}&path=//example.com`, { headers: { cookie } })).status, 400);
    assert.equal((await fetch(`${origin}/api/admin/settings/preview.html?version=${original.version}`, { headers: { cookie } })).status, 409);
    for (const [route, text] of [['/', 'Custom English positioning'], ['/el/', 'Custom Greek positioning']]) {
      const preview = await fetch(`${previewUrl}&path=${encodeURIComponent(route)}`, { headers: { cookie } });
      assert.equal(preview.status, 200);
      assert.equal(preview.headers.get('cache-control'), 'no-store');
      assert.equal(preview.headers.get('x-robots-tag'), 'noindex,nofollow,noarchive');
      assert.equal(preview.headers.get('x-frame-options'), 'SAMEORIGIN');
      assert.match(preview.headers.get('content-security-policy'), /frame-ancestors 'self'/);
      const $ = load(await preview.text());
      assert.equal($('.hero-positioning').text(), text);
      assert.equal($('meta[name="robots"]').attr('content'), 'noindex,nofollow,noarchive');
      assert.ok($(`a[href*="path=${encodeURIComponent(route === '/el/' ? '/el/studio' : '/studio')}"]`).length > 0);
      const publicPage = load(await (await fetch(`${origin}${route}`)).text());
      assert.notEqual(publicPage('.hero-positioning').text(), text);
    }
    assert.equal((await fetch(`${origin}/api/admin/settings/publish`, { method: 'POST', headers, body: JSON.stringify({ version: draft.version }) })).status, 200);
    for (const [route, text] of [['/', 'Custom English positioning'], ['/el/', 'Custom Greek positioning']]) {
      const $ = load(await (await fetch(`${origin}${route}`)).text());
      assert.equal($('.hero-positioning').text(), text);
      assert.equal($('meta[name="robots"]').attr('content'), 'noindex,follow');
      assert.equal($('meta[property="og:image"]').attr('content'), `${origin}/assets/anchevlogo.png`);
      assert.equal($('meta[property="og:image:width"]').length, 0);
    }
    const sitemap = load(await (await fetch(`${origin}/sitemap.xml`)).text(), { xml: true });
    const locations = sitemap('url > loc').map((_index, entry) => sitemap(entry).text()).get();
    assert.equal(locations.includes(origin), false);
    assert.equal(locations.includes(`${origin}/el/`), false);
    assert.ok(locations.includes(`${origin}/studio`));
  } finally {
    const { version } = await (await fetch(`${origin}/api/admin/settings`, { headers: { cookie } })).json();
    const response = await fetch(`${origin}/api/admin/settings`, { method: 'POST', headers, body: JSON.stringify({ ...original, version, homepage: original.homepage || {}, seo: original.seo || { title: '', description: '', image: '', noindex: false } }) });
    assert.equal(response.status, 200);
    const draft = await response.json();
    assert.equal((await fetch(`${origin}/api/admin/settings/publish`, { method: 'POST', headers, body: JSON.stringify({ version: draft.version }) })).status, 200);
  }
});

before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'anchev-server-'));
  await writeFile(path.join(directory, 'projects.json'), JSON.stringify([{ id: 'kept-url', name: 'Published original', note: 'Film made in Athens', frames: [] }]));
  const store = new ContentStore(directory);
  store.importJson();
  await createUser(store, { email: 'owner@example.com', name: 'Owner', role: 'owner', password });
  store.close();
  child = fork('server.js', [], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'test', BUNDLE_PUBLIC_ASSETS: '1', PORT: '0', DATA_DIR: directory, UPLOADS_DIR: path.join(directory, 'uploads'), SESSION_SECRET: 'test-only-session-secret-with-enough-length', MEDIA_WORKER: '0', PODCAST_FEED_URL: 'http://127.0.0.1:1/unavailable' }, silent: true });
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
  const css = await fetch(`${origin}/styles/experience.css`, { headers: { 'accept-encoding': 'gzip' } });
  assert.equal(css.headers.get('content-encoding'), 'gzip');
  assert.match(css.headers.get('vary'), /Accept-Encoding/);
  assert.equal(css.headers.get('cache-control'), 'no-cache');
  const logo = await fetch(`${origin}/assets/anchevlogo.png`);
  assert.match(logo.headers.get('cache-control'), /max-age=3600/);
  const session = await fetch(`${origin}/api/admin/session`, { headers: { cookie, 'accept-encoding': 'gzip' } });
  assert.equal(session.headers.get('content-encoding'), null);
  for (const font of ['manrope/manrope-latin-wght-normal.woff2', 'manrope/manrope-greek-wght-normal.woff2', 'bodoni-moda/bodoni-moda-latin-wght-normal.woff2', 'gfs-didot/gfs-didot-greek-400-normal.woff2']) {
    const response = await fetch(`${origin}/fonts/${font}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /font\/woff2/);
  }
  for (const subset of ['latin', 'greek', 'cyrillic']) {
    for (const style of ['normal', 'italic']) {
      for (const font of [`source-serif-4/source-serif-4-${subset}-standard-${style}.woff2`, `ibm-plex-sans/ibm-plex-sans-${subset}-wght-${style}.woff2`]) {
        const response = await fetch(`${origin}/fonts/${font}`);
        assert.equal(response.status, 200, font);
        assert.match(response.headers.get('content-type'), /font\/woff2/);
      }
    }
  }
  const response = await fetch(`${origin}/`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.match(response.headers.get('content-security-policy'), /nonce-/);
  const html = await response.text();
  assert.equal(load(html)('link[rel="preload"][as="font"]').length, 2);
  assert.ok(load(html)('link[as="font"][href*="source-serif-4-latin-standard-normal"]').length);
  assert.ok(load(html)('link[as="font"][href*="ibm-plex-sans-latin-wght-normal"]').length);
  assert.equal(load(html)('.brandmark img').attr('fetchpriority'), 'high');
  assert.equal(load(html)('link[rel="icon"]').length, 1);
  assert.equal(load(html)('link[rel="icon"]').attr('href'), '/assets/favicon-32.png');
  const stylesheets = load(html)('link[rel="stylesheet"]');
  assert.equal(stylesheets.length, 1);
  const bundle = await fetch(`${origin}${stylesheets.attr('href')}`, { headers: { 'accept-encoding': 'gzip' } });
  assert.equal(bundle.status, 200);
  assert.equal(bundle.headers.get('content-encoding'), 'gzip');
  assert.equal(bundle.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.equal(bundle.headers.get('x-content-type-options'), 'nosniff');
  assert.match(bundle.headers.get('content-security-policy'), /default-src 'self'/);
  const script = load(html)('script[src*="/assets/site-"]');
  assert.equal(script.length, 1);
  assert.match(script.attr('src'), /^\/assets\/site-[a-f0-9]{20}\.js$/);
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
  const body = { name: 'Test person', email: 'test@example.com', message: 'We would like to discuss a film production.', privacy: true, submissionId: crypto.randomUUID(), productionType: 'studio', timeline: 'Spring 2027', crewSize: '12', requirements: 'A controlled interview setup.' };
  const accepted = await fetch(`${origin}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal(accepted.status, 201);
  const rejected = await fetch(`${origin}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, privacy: false }) });
  assert.equal(rejected.status, 400);
  const inbox = await (await fetch(`${origin}/api/admin/inquiries`, { headers: { cookie } })).json();
  assert.equal(inbox.inquiries.length, 1);
  assert.match(inbox.inquiries[0].message, /Production: Anchev Studio/);
  assert.match(inbox.inquiries[0].message, /Crew size: 12/);
  assert.match(inbox.inquiries[0].message, /Timeline: Spring 2027/);
  assert.match(inbox.inquiries[0].message, /Requirements: A controlled interview setup/);
  const retried = await fetch(`${origin}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal(retried.status, 201);
  assert.equal((await retried.json()).reference, body.submissionId);
  assert.equal((await (await fetch(`${origin}/api/admin/inquiries`, { headers: { cookie } })).json()).inquiries.length, 1);
  const receipt = await fetch(`${origin}/api/contact`, { method: 'POST', body: new URLSearchParams({ name: body.name, email: body.email, message: body.message, privacy: 'on', locale: 'el' }) });
  assert.equal(receipt.status, 201);
  assert.match(receipt.headers.get('content-type'), /text\/html/);
  assert.match(await receipt.text(), /Λάβαμε το αίτημά σας/);
  const invalid = await fetch(`${origin}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, crewSize: '-1' }) });
  assert.equal(invalid.status, 400);
});

test('brand navigation leads with work and preserves secondary destinations without invented content', async () => {
  for (const locale of ['en', 'el']) {
    const prefix = locale === 'el' ? '/el' : '';
    const home = load(await (await fetch(`${origin}${prefix}/`)).text());
    assert.deepEqual(home('.cinema-nav a').map((_index, link) => home(link).attr('href')).get(), ['work', 'studio', 'about', 'news', 'contact'].map((route) => `${prefix}/${route}`));
    assert.deepEqual(home('.cinema-main > section').slice(0, 4).map((_index, section) => home(section).attr('id')).get(), ['home', 'work-page', 'about-page', 'services-page']);
    assert.equal(home('#services-page .cinema-service-list > li').length, 6);
    assert.equal(home('.cinema-footer__identity img').attr('src'), '/assets/anchevlogo.png');
    assert.equal(home('.cinema-footer__wordmark').length, 0);
    assert.equal(home('.cinema-news-note').length, 0);
    assert.equal(home('#clients-page, #articles-page, #podcast-page').length, 0);
    const services = load(await (await fetch(`${origin}${prefix}/services`)).text());
    assert.equal(services('.cinema-service-list').first().children().length, 6);
    assert.equal(services('.cinema-support .cinema-service-list > li').length, 7);
    const about = load(await (await fetch(`${origin}${prefix}/about`)).text());
    assert.match(about('.cinema-about-story').text(), /Boris Anchev/);
    assert.equal(about('.cinema-about-story > section').length, 4);
    assert.equal(about('blockquote').length, 0);
  }
});

test('brand filmmaking pages provide bilingual content, canonicals and working related links', async () => {
  for (const slug of ['narrative-production', 'documentary-production', 'music-videos']) {
    for (const locale of ['en', 'el']) {
      const route = `${locale === 'el' ? '/el' : ''}/services/${slug}`;
      const response = await fetch(`${origin}${route}`);
      assert.equal(response.status, 200, route);
      const $ = load(await response.text());
      assert.equal($('html').attr('lang'), locale);
      assert.equal($('h1').length, 1);
      assert.equal($('link[rel="canonical"]').attr('href'), `${origin}${route}`);
      assert.ok($('link[hreflang="el"]').length);
      assert.equal($('.service-capabilities li').length, 6);
      assert.equal($('.case-study__copy-section').length, 4);
      assert.equal($('.service-page__links a').length, 3);
      assert.ok($(`link[as="font"][href*="-${locale === 'el' ? 'greek' : 'latin'}-standard-normal"]`).length);
      assert.doesNotMatch($('.case-study__content').text(), /Between light|\[Project title\]/);
    }
  }
  for (const slug of ['film-documentary-production', 'video-production-athens', 'live-streaming-athens']) {
    assert.equal((await fetch(`${origin}/services/${slug}`)).status, 200, slug);
  }
});

test('studio pages provide verified dimensions, real galleries and a dedicated enquiry in both languages', async () => {
  for (const locale of ['en', 'el']) {
    const $ = load(await (await fetch(`${origin}${locale === 'el' ? '/el' : ''}/studio`)).text());
    assert.equal($('#studio-title').length, 1, `${locale}: ${$('h1').text()} / ${$('title').text()}`);
    assert.equal($('.case-study__detail').length, 4);
    assert.equal($('[data-gallery-image]').length, 3);
    assert.equal($('#studio-enquiry #inquiry-form').length, 1);
    assert.equal($('[name="productionType"]').attr('value'), 'studio');
    assert.equal($('#inquiry-crew').attr('min'), '1');
    assert.equal($('#inquiry-requirements').length, 1);
  }
});

const adminPost = (route, body) => fetch(`${origin}/api/admin/${route}`, { method: 'POST', headers: { cookie, origin, 'x-csrf-token': csrf, 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('News HTML, previews, translations and sitemaps share publication rules without exposing drafts', async () => {
  let article = { id: 'news-production-notes', kind: 'news', locale: 'en', heading: 'Production notes', intro: 'An original account of a real production.', richContent: '<h2>On location</h2><p>Our production story with <strong>real detail</strong>.</p>', thumbnail: '/media/studio/studio-frame-01.jpg', imageAlt: 'A real view of the studio', publicationDate: '', category: 'studio' };
  let response = await adminPost('news', article);
  assert.equal(response.status, 200);
  article = (await response.json()).saved;
  assert.equal((await fetch(`${origin}/news/production-notes`)).status, 404);
  assert.equal((await fetch(`${origin}/api/admin/pages/en/${article.id}/preview.html`)).status, 401);
  const preview = await fetch(`${origin}/api/admin/pages/en/${article.id}/preview.html`, { headers: { cookie } });
  assert.equal(preview.status, 200);
  const previewHtml = load(await preview.text());
  assert.match(previewHtml('.news-prose').text(), /real detail/);
  assert.match(previewHtml('.news-meta').text(), /Draft/);
  assert.equal(previewHtml('time').length, 0);
  assert.ok(JSON.parse(previewHtml('script[type="application/ld+json"]').text())['@graph'].some((node) => node['@type'] === 'BlogPosting' && !node.datePublished));
  assert.equal(preview.headers.get('x-robots-tag'), 'noindex,nofollow,noarchive');
  response = await adminPost('news', { ...article, publicationDate: '2020-01-01T10:00:00Z', publish: true });
  article = (await response.json()).saved;
  let $ = load(await (await fetch(`${origin}/news/production-notes`)).text());
  assert.equal($('h1').text(), 'Production notes');
  assert.equal($('.news-prose h2').text(), 'On location');
  assert.equal($('link[rel="canonical"]').attr('href'), `${origin}/news/production-notes`);
  assert.equal($('meta[property="article:published_time"]').attr('content'), '2020-01-01T10:00:00Z');
  assert.ok(JSON.parse($('script[type="application/ld+json"]').text())['@graph'].some((node) => node['@type'] === 'BlogPosting'));
  assert.equal($('link[hreflang="el"]').length, 0);
  assert.match(await (await fetch(`${origin}/news`)).text(), /href="\/news\/production-notes"/);
  assert.equal((await fetch(`${origin}/pages/news-production-notes`, { redirect: 'manual' })).headers.get('location'), '/news/production-notes');
  await adminPost('news', { ...article, locale: 'el', version: undefined, heading: 'Σημειώσεις παραγωγής', publish: true });
  $ = load(await (await fetch(`${origin}/news/production-notes`)).text());
  assert.equal($('link[hreflang="el"]').attr('href'), `${origin}/el/news/production-notes`);
  assert.equal((await fetch(`${origin}/el/news/production-notes`)).status, 200);
  article = (await (await adminPost('news', { ...article, heading: 'Private changes' })).json()).saved;
  assert.doesNotMatch(await (await fetch(`${origin}/news/production-notes`)).text(), /Private changes/);
  let sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
  assert.match(sitemap, /<loc>[^<]+\/news\/production-notes<\/loc>/);
  assert.doesNotMatch(sitemap, /\/pages\/news-/);
  response = await adminPost('news', { ...article, publicationDate: '2099-01-01T10:00:00Z', publish: true });
  article = (await response.json()).saved;
  assert.equal(article.status, 'scheduled');
  assert.equal((await fetch(`${origin}/news/production-notes`)).status, 404);
  assert.equal((await (await fetch(`${origin}/api/news`)).json()).news.length, 0);
  sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
  assert.doesNotMatch(sitemap, new RegExp(`<loc>${origin}/news/production-notes</loc>`));
  await adminPost(`pages/en/${article.id}/unpublish`, { version: article.version });
  const greek = (await (await fetch(`${origin}/api/admin/news`, { headers: { cookie } })).json()).news.find((entry) => entry.locale === 'el');
  await adminPost(`pages/el/${greek.id}/unpublish`, { version: greek.version });
});

test('media restoration enforces permissions, CSRF, stale checksums and quarantine through HTTP', async () => {
  const store = new ContentStore(directory);
  const media = new MediaService(store, path.join(directory, 'uploads'));
  const upload = async (color, route) => {
    const bytes = await sharp({ create: { width: 32, height: 24, channels: 3, background: color } }).png().toBuffer();
    const body = new FormData();
    body.append('file', new Blob([bytes], { type: 'image/png' }), 'restore-fixture.png');
    const response = await fetch(`${origin}/api/admin/${route}`, { method: 'POST', headers: { cookie, origin, 'x-csrf-token': csrf }, body });
    assert.ok(response.ok);
    const result = await response.json();
    await media.processNext();
    return result.asset;
  };
  try {
    const original = await upload('#996600', 'upload');
    const replacement = await upload('#006699', `media/${original.id}/replace`);
    const endpoint = `media/${original.id}/restore`;
    const history = `media/${original.id}/history`;
    assert.equal((await fetch(`${origin}/api/admin/${history}`)).status, 401);
    const { versions } = await (await fetch(`${origin}/api/admin/${history}`, { headers: { cookie } })).json();
    const body = { version: versions[0].id, checksum: replacement.checksum };
    assert.equal((await fetch(`${origin}/api/admin/${endpoint}`, { method: 'POST', headers: { cookie, origin, 'content-type': 'application/json' }, body: JSON.stringify(body) })).status, 403);
    assert.equal((await adminPost(endpoint, { ...body, checksum: original.checksum })).status, 409);
    await createUser(store, { email: 'media-viewer@example.com', name: 'Viewer', role: 'viewer', password });
    const session = await fetch(`${origin}/api/admin/session`);
    const viewerCookie = session.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
    const login = await fetch(`${origin}/api/admin/login`, { method: 'POST', headers: { cookie: viewerCookie, origin, 'x-csrf-token': (await session.json()).csrf, 'content-type': 'application/json' }, body: JSON.stringify({ email: 'media-viewer@example.com', password }) });
    assert.equal(login.status, 200);
    const viewerHeaders = { cookie: login.headers.getSetCookie().map((value) => value.split(';')[0]).join('; '), origin, 'x-csrf-token': (await login.json()).csrf, 'content-type': 'application/json' };
    assert.equal((await fetch(`${origin}/api/admin/${history}`, { headers: viewerHeaders })).status, 200);
    assert.equal((await fetch(`${origin}/api/admin/${endpoint}`, { method: 'POST', headers: viewerHeaders, body: JSON.stringify(body) })).status, 403);
    await writeFile(media.filename(replacement), 'invalid original bytes');
    await media.reconcile();
    const blocked = await fetch(`${origin}${original.url}`);
    assert.equal(blocked.status, 503);
    assert.equal(blocked.headers.get('cache-control'), 'no-store');
    assert.equal((await adminPost(`media/${original.id}/retry`, {})).status, 409);
    const restored = await adminPost(endpoint, body);
    assert.equal(restored.status, 200);
    assert.equal((await restored.json()).asset.checksum, original.checksum);
    assert.equal((await fetch(`${origin}${original.url}`)).status, 200);
  } finally { await media.stop(); store.close(); }
});

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
  const current = (await (await fetch(`${origin}/api/admin/projects`, { headers: { cookie } })).json()).projects.find((project) => project.id === 'translated-film');
  current.translations.el.seo = { image: '/assets/anchevlogo.png', noindex: true };
  assert.equal((await adminPost('projects', { ...current, publish: true })).status, 200);
  const hiddenGreek = load(await (await fetch(`${origin}/el/work/translated-film`)).text());
  assert.equal(hiddenGreek('meta[name="robots"]').attr('content'), 'noindex,follow');
  assert.equal(hiddenGreek('meta[property="og:image"]').attr('content'), `${origin}/assets/anchevlogo.png`);
  const updated = load(await (await fetch(`${origin}/sitemap.xml`)).text(), { xml: true });
  const locations = updated('url > loc').map((_index, entry) => updated(entry).text()).get();
  assert.equal(locations.includes(`${origin}/el/work/translated-film`), false);
  assert.ok(locations.includes(`${origin}/work/translated-film`));
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

test('service editorial drafts preview in place and publish independently per locale', async () => {
  for (const locale of ['en', 'el']) {
    const route = `${origin}${locale === 'el' ? '/el' : ''}/services/video-production-athens`;
    const document = { id: 'service-video-production-athens', locale, heading: `Managed ${locale} service`, intro: 'A managed introduction.', body: 'A managed production brief.', blocks: [{ type: 'text', title: 'Managed planning', text: 'Plan the approved production.' }, { type: 'fact', title: 'Capability', text: 'Approved interview production' }], seo: { title: `Managed ${locale} SEO`, description: 'Approved service description.', image: '/assets/anchevlogo.png', noindex: true } };
    const draftResponse = await adminPost('pages', document);
    assert.equal(draftResponse.status, 200);
    const draft = (await draftResponse.json()).saved;
    assert.equal((await (await fetch(route)).text()).includes(document.heading), false);
    const preview = await fetch(`${origin}/api/admin/pages/${locale}/${document.id}/preview.html`, { headers: { cookie } });
    assert.equal(preview.status, 200);
    const previewPage = load(await preview.text());
    assert.equal(previewPage('#service-title').text(), document.heading);
    assert.equal(previewPage('meta[name="robots"]').attr('content'), 'noindex,nofollow,noarchive');
    assert.equal((await adminPost('pages', { ...draft, publish: true })).status, 200);
    const published = load(await (await fetch(route)).text());
    assert.equal(published('#service-title').text(), document.heading);
    assert.equal(published('.service-capabilities li').length, 1);
    assert.equal(published('.service-capabilities li').text(), 'Approved interview production');
    assert.equal(published('title').text(), document.seo.title);
    assert.equal(published('meta[name="robots"]').attr('content'), 'noindex,follow');
    const sitemap = load(await (await fetch(`${origin}/sitemap.xml`)).text(), { xml: true });
    assert.equal(sitemap('loc').map((_index, element) => sitemap(element).text()).get().includes(route), false);
  }
});

test('studio facts and contact copy use private bilingual editorial drafts', async () => {
  const templates = await (await fetch(`${origin}/api/admin/page-templates`, { headers: { cookie } })).json();
  assert.ok(templates.pages.length >= 24);
  for (const locale of ['en', 'el']) {
    for (const id of ['studio', 'contact']) {
      const template = templates.pages.find((page) => page.id === id && page.locale === locale);
      const document = { ...template, heading: `Managed ${locale} ${id}`, intro: 'An approved studio or contact introduction.' };
      const response = await adminPost('pages', document);
      assert.equal(response.status, 200);
      const saved = (await response.json()).saved;
      const publicPath = `${locale === 'el' ? '/el' : ''}/${id}`;
      assert.equal((await (await fetch(`${origin}${publicPath}`)).text()).includes(document.heading), false);
      const preview = await fetch(`${origin}/api/admin/pages/${locale}/${id}/preview.html`, { headers: { cookie } });
      assert.equal(preview.status, 200);
      const previewPage = load(await preview.text());
      assert.equal(previewPage(id === 'studio' ? '#studio-title' : '.contact-final__title').text(), document.heading);
      assert.equal((await adminPost('pages', { ...saved, publish: true })).status, 200);
      const published = load(await (await fetch(`${origin}${publicPath}`)).text());
      assert.equal(published(id === 'studio' ? '#studio-title' : '.contact-final__title').text(), document.heading);
      if (id === 'studio') assert.equal(published('.case-study__detail').length, 4);
      else assert.equal(published('#inquiry-form').length, 1);
      const alias = await fetch(`${origin}${locale === 'el' ? '/el' : ''}/pages/${id}`, { redirect: 'manual' });
      assert.equal(alias.status, 301);
      assert.equal(alias.headers.get('location'), publicPath);
    }
  }
});

test('public destination pages render crawlable bilingual content, shared navigation and canonical URLs', async () => {
  for (const locale of ['en', 'el']) {
    for (const key of ['work', 'services', 'about', 'contact', 'press', 'podcast', 'news']) {
      const pathname = `${locale === 'el' ? '/el' : ''}/${key}`;
      const response = await fetch(`${origin}${pathname}`);
      assert.equal(response.status, 200, pathname);
      const $ = load(await response.text());
      assert.equal($('html').attr('lang'), locale);
      assert.equal($('h1').length, 1, pathname);
      assert.equal($('link[rel="canonical"]').attr('href'), `${origin}${pathname}`);
      assert.equal($('.cinema-nav a').length, 5);
      assert.ok($(`.cinema-footer a[href="${locale === 'el' ? '/el' : ''}/news"]`).length);
      assert.equal($('.cinema-nav a[href$="/news"]').length, 1);
      assert.equal($('main#main-content').length, 1);
    }
  }
});

test('About copy previews privately and publishes to the full page and homepage in each language', async () => {
  const { pages } = await (await fetch(`${origin}/api/admin/page-templates`, { headers: { cookie } })).json();
  for (const locale of ['en', 'el']) {
    const template = pages.find((page) => page.id === 'about' && page.locale === locale);
    assert.ok(template);
    const document = { ...template, heading: `Approved ${locale} company heading`, intro: `Approved ${locale} company introduction.` };
    let response = await adminPost('pages', document);
    assert.equal(response.status, 200);
    const saved = (await response.json()).saved;
    const route = `${locale === 'el' ? '/el' : ''}/about`;
    assert.equal((await (await fetch(`${origin}${route}`)).text()).includes(document.heading), false);
    const preview = await fetch(`${origin}/api/admin/pages/${locale}/about/preview.html`, { headers: { cookie } });
    assert.equal(preview.status, 200);
    assert.equal(load(await preview.text())('h1').text(), document.heading);
    response = await adminPost('pages', { ...saved, publish: true });
    assert.equal(response.status, 200);
    const published = load(await (await fetch(`${origin}${route}`)).text());
    assert.equal(published('h1').text(), document.heading);
    assert.equal(published('.cinema-about-intro').text(), document.intro);
    assert.equal(published('.cinema-about-story > section > div > h2').length, document.blocks.filter((block) => block.type === 'text').length);
    const home = load(await (await fetch(`${origin}${locale === 'el' ? '/el/' : '/'}`)).text());
    assert.equal(home('#about-page h2').text(), document.heading);
    assert.equal(home('#about-page .cinema-about p:not(.section-kicker)').text(), document.intro);
  }
});