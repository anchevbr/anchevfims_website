import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ContentStore } from '../src/database.js';
import { renderPageBody, renderPublicDocument, sitePageTemplates } from '../src/public-pages.js';
import { renderContactPageMarkup, renderArticlesMarkup, renderPodcastEpisodeMarkup, renderProjectSupportingMarkup } from '../public/scripts/modules/content-markup.js';
import { getServicePage, getServicePath, servicePages } from '../public/scripts/modules/service-pages.js';
import { settingsSchema } from '../src/admin-api.js';
import { load } from 'cheerio';

test('Greek content and navigation are rendered on the server with explicit language links', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'anchev-locale-'));
  const store = new ContentStore(directory);
  store.setSettings({ contact: { email: 'test@example.com' }, social: [] });
  try {
    const template = '<html lang="en"><head></head><body><div class="topbar-actions"></div><main class="hero"><h1>Original</h1><p class="hero-kicker"></p></main><a href="/studio">Studio</a><div id="contact-page-content"></div><div id="work-browser"></div></body></html>';
    const html = renderPublicDocument(template, { language: 'el', route: '/el/', store, home: true });
    assert.match(html, /lang="el"/);
    assert.match(html, /href="\/el\/studio"/);
    assert.match(html, /Ονοματεπώνυμο/);
    assert.match(html, /href="\/" lang="en"/);
    assert.match(html, /Anchev/);
    assert.match(html, /Films\./);
  } finally { store.close(); await rm(directory, { recursive: true, force: true }); }
});

test('structured content and localized inquiries escape untrusted content', () => {
  const html = renderPageBody({ heading: '<script>bad</script>', body: 'A & B', blocks: [{ type: 'text', title: '<b>Title</b>', text: '<img onerror=bad>' }] });
  assert.equal(html.includes('<script>bad</script>'), false);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(renderContactPageMarkup({ email: 'test@example.com' }, 'el').includes('Αποστολή brief'));
  assert.ok(renderContactPageMarkup({ email: 'test@example.com' }, 'en').includes('Send brief'));
  assert.match(renderArticlesMarkup([{ url: 'https://example.com', title: 'Article', publishedAt: '2026-01-15' }], 'el'), /Ιαν/);
  assert.match(renderPodcastEpisodeMarkup({ title: 'Episode', duration: '01:15:00' }, 0, 'https://example.com', 'el'), /1 ώρ. 15 λεπ./);
  assert.match(renderProjectSupportingMarkup({ behindVideo: 'https://youtu.be/lINECZrijtg' }, 'el'), /Δείτε στο YouTube/);
  const template = sitePageTemplates().find((page) => page.id === 'studio' && page.locale === 'en');
  assert.ok(template.blocks.some((block) => block.text?.includes('Apostolou Rapti 5')));
  assert.ok(template.blocks.some((block) => block.url?.startsWith('https://www.google.com/maps/dir/')));
  const video = { type: 'video', url: '/media/film.mp4' };
  const hero = { type: 'image', url: '/media/hero.jpg' };
  assert.deepEqual(getServicePage(getServicePath(servicePages[0]), { heading: 'Film', intro: '', body: '', blocks: [video, hero] }).mediaBlocks, [video]);
});

test('homepage CMS copy is locale-specific, escaped and falls back when empty', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'anchev-home-copy-'));
  const store = new ContentStore(directory);
  try {
    const settings = settingsSchema.parse({ videoSource: '', mobileVideoSource: '', showreelSource: '', contact: { email: 'test@example.com', phone: '', location: '' }, social: [], homepage: { en: { heroPositioning: '<script>bad</script>\nEnglish copy', workHeading: '' }, el: { heroPositioning: 'Greek copy' } } });
    store.setSettings(settings);
    const template = '<html><head></head><body><main class="hero"><h1>Brand</h1></main><h2 id="work-title">Existing heading</h2></body></html>';
    const english = renderPublicDocument(template, { store, home: true });
    const greek = renderPublicDocument(template, { store, home: true, language: 'el', route: '/el/' });
    assert.match(english, /&lt;script&gt;bad&lt;\/script&gt;<br>English copy/);
    assert.equal(load(english)('#work-title').text(), 'Selected work.');
    assert.equal(load(greek)('#work-title').text(), 'Επιλεγμένες ταινίες.');
    assert.equal(english.includes('<script>bad</script>'), false);
    assert.match(greek, /class="hero-positioning">Greek copy/);
    assert.equal(greek.includes('<br>English copy'), false);
    assert.throws(() => settingsSchema.parse({ ...settings, homepage: { en: { heroKicker: 'x'.repeat(251) } } }));
  } finally { store.close(); await rm(directory, { recursive: true, force: true }); }
});

test('legal navigation uses the canonical privacy notice and only published locale-specific CMS pages', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'anchev-legal-'));
  const store = new ContentStore(directory);
  try {
    store.setSettings({});
    const template = '<html><head></head><body><button class="legal-link" data-open-panel="privacy">Privacy</button><button data-open-panel="cookies">Cookies</button><button data-open-panel="terms">Terms</button><div id="panel-content-cookies"></div><div id="panel-content-terms"></div></body></html>';
    store.savePage({ id: 'cookies', locale: 'el', heading: 'Draft only', blocks: [] }, null);
    let $ = load(renderPublicDocument(template, { store, home: true, language: 'el', route: '/el/' }));
    assert.equal($('a.legal-link').attr('href'), '/el/privacy');
    assert.equal($('[data-open-panel="privacy"]').length, 0);
    assert.match($('#panel-content-cookies').text(), /Απαραίτητη αποθήκευση/);
    assert.match($('#panel-content-terms').text(), /Αιτήματα παραγωγής/);
    const draft = store.page('cookies', 'el');
    store.savePage(draft, null, true);
    $ = load(renderPublicDocument(template, { store, home: true, language: 'el', route: '/el/' }));
    assert.equal($('a[href="/el/pages/cookies"]').length, 1);
    const english = load(renderPublicDocument(template, { store, home: true }));
    assert.equal(english('[data-open-panel="cookies"]').length, 1);
    assert.match(english('#panel-content-cookies').text(), /Essential storage/);
  } finally { store.close(); await rm(directory, { recursive: true, force: true }); }
});