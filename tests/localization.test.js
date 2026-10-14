import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ContentStore } from '../src/database.js';
import { renderPageBody, renderPublicDocument } from '../src/public-pages.js';
import { renderContactPageMarkup } from '../public/scripts/modules/content-markup.js';

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
  assert.ok(renderContactPageMarkup({ email: 'test@example.com' }, 'el').includes('Αποστολή αιτήματος'));
  assert.ok(renderContactPageMarkup({ email: 'test@example.com' }, 'en').includes('Send inquiry'));
});