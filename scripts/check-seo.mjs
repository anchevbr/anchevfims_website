import assert from 'node:assert/strict';
import { XMLParser } from 'fast-xml-parser';
import { servicePages, getServicePath } from '../public/scripts/modules/service-pages.js';

const base = process.env.CHECK_URL || 'http://localhost:3011';
const paths = ['/', '/studio', '/el/studio', ...servicePages.flatMap((page) => ['en', 'el'].map((language) => getServicePath(page, language)))];
const sitemapResponse = await fetch(`${base}/sitemap.xml`);
assert.equal(sitemapResponse.status, 200);
const sitemap = new XMLParser().parse(await sitemapResponse.text());
const entries = Array.isArray(sitemap.urlset.url) ? sitemap.urlset.url : [sitemap.urlset.url];
const locations = entries.map((entry) => entry.loc);
const canonicalOrigin = new URL(locations[0]).origin;
const projectPaths = locations.map((location) => new URL(location).pathname).filter((pathname) => pathname.startsWith('/work/'));
const episodePaths = locations.map((location) => new URL(location).pathname).filter((pathname) => pathname.startsWith('/podcast/'));
const titles = new Set();

for (const pathname of [...paths, ...projectPaths, ...episodePaths]) {
  const response = await fetch(`${base}${pathname}`);
  assert.equal(response.status, 200, pathname);
  const html = await response.text();
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  assert.ok(title, `${pathname}: title`);
  assert.ok(!titles.has(title), `${pathname}: unique title`);
  titles.add(title);
  assert.ok(html.includes(`<link rel="canonical" href="${canonicalOrigin}${pathname === '/' ? '' : pathname}"`), `${pathname}: canonical`);
  assert.match(html, /<meta name="description" content="[^"]+"/);
  assert.match(html, /<meta name="robots" content="index,follow/);
  assert.ok(!response.headers.get('x-robots-tag')?.includes('noindex'));
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${pathname}: single H1`);
  assert.ok(locations.includes(`${canonicalOrigin}${pathname === '/' ? '' : pathname}`), `${pathname}: sitemap`);
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || 'null');
  assert.ok(schema?.['@graph']?.length, `${pathname}: schema`);
  const greek = pathname.startsWith('/el/') || pathname.startsWith('/podcast/');
  assert.ok(html.includes(`<html lang="${greek ? 'el' : 'en'}">`), `${pathname}: language`);
  if (pathname.includes('/services/') || pathname.endsWith('/studio')) {
    const englishPath = greek ? pathname.slice(3) : pathname;
    for (const [language, alternatePath] of [['en', englishPath], ['el', `/el${englishPath}`]]) {
      assert.ok(html.includes(`hreflang="${language}" href="${canonicalOrigin}${alternatePath}"`), `${pathname}: reciprocal ${language}`);
    }
    assert.ok(html.includes('href="/services/') || html.includes('href="/el/services/'), `${pathname}: internal service links`);
  }
  if (pathname.includes('/services/')) {
    assert.ok(html.includes('mailto:'), `${pathname}: direct contact`);
    assert.ok(html.includes('<section class="case-study__copy-section">'), `${pathname}: readable service copy`);
  }
  if (pathname === '/work/anti-bullying') {
    const video = schema['@graph'].find((node) => node['@type'] === 'CreativeWork')?.associatedMedia;
    if (html.includes('lINECZrijtg')) {
      assert.equal(video?.['@type'], 'VideoObject');
      assert.equal(video.uploadDate, '2026-03-01');
      assert.equal(video.duration, 'PT2M3S');
      assert.equal(video.embedUrl, 'https://www.youtube-nocookie.com/embed/lINECZrijtg');
      assert.ok(video.thumbnailUrl);
      assert.ok(!video.contentUrl, 'YouTube watch pages are not video files');
    }
  }
  if (pathname.startsWith('/podcast/')) {
    assert.ok(schema['@graph'].some((node) => node['@type'] === 'PodcastEpisode' && node.url === `${canonicalOrigin}${pathname}`));
    assert.ok(html.includes('preload="none"'), `${pathname}: audio does not preload`);
  }
  console.log(`PASS ${pathname}`);
}

for (const pathname of ['/studio', '/el/studio', ...paths.filter((entry) => entry.includes('/services/')), ...projectPaths, ...episodePaths]) {
  const response = await fetch(`${base}${pathname}/?source=seo-check`, { redirect: 'manual' });
  assert.equal(response.status, 301, `${pathname}: slash redirect`);
  assert.equal(response.headers.get('location'), `${pathname}?source=seo-check`);
}
const missing = await fetch(`${base}/services/does-not-exist`);
assert.equal(missing.status, 404);
assert.match(await missing.text(), /noindex,nofollow/);
const robots = await (await fetch(`${base}/robots.txt`)).text();
assert.ok(robots.includes('Disallow: /studio/'));
assert.ok(robots.includes('Disallow: /api/'));
console.log('PASS slash redirects, genuine 404 and private-route robots rules');