import assert from 'node:assert/strict';
import { XMLParser } from 'fast-xml-parser';
import { load } from 'cheerio';
import { servicePages, getServicePath } from '../public/scripts/modules/service-pages.js';

const base = process.env.CHECK_URL || 'http://localhost:3011';
const destinations = ['work', 'services', 'about', 'contact', 'press', 'podcast', 'news'];
const paths = ['/', '/el/', '/studio', '/el/studio', ...destinations.flatMap((key) => [`/${key}`, `/el/${key}`]), ...servicePages.flatMap((page) => ['en', 'el'].map((language) => getServicePath(page, language)))];
const sitemapResponse = await fetch(`${base}/sitemap.xml`);
assert.equal(sitemapResponse.status, 200);
const sitemap = new XMLParser().parse(await sitemapResponse.text());
const entries = Array.isArray(sitemap.urlset.url) ? sitemap.urlset.url : [sitemap.urlset.url];
const locations = entries.map((entry) => entry.loc);
assert.equal(new Set(locations.map((location) => new URL(location).href)).size, locations.length, 'sitemap has no duplicate canonical URLs');
const canonicalOrigin = new URL(locations[0]).origin;
const projectPaths = locations.map((location) => new URL(location).pathname).filter((pathname) => /^\/(?:el\/)?work\/[^/]+$/.test(pathname));
const episodePaths = locations.map((location) => new URL(location).pathname).filter((pathname) => pathname.startsWith('/podcast/'));
const newsPaths = locations.map((location) => new URL(location).pathname).filter((pathname) => /^\/(?:el\/)?news\/[^/]+$/.test(pathname));
const targetPaths = [...new Set([...paths, ...projectPaths, ...episodePaths, ...newsPaths])];
const titles = new Set();

for (const pathname of targetPaths) {
  const response = await fetch(`${base}${pathname}`);
  assert.equal(response.status, 200, pathname);
  const html = await response.text();
  const document = load(html);
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  assert.ok(title, `${pathname}: title`);
  assert.ok(!titles.has(title), `${pathname}: unique title`);
  titles.add(title);
  const canonical = document('link[rel="canonical"]').attr('href');
  assert.equal(new URL(canonical).href, new URL(pathname, canonicalOrigin).href, `${pathname}: canonical`);
  assert.match(html, /<meta name="description" content="[^"]+"/);
  assert.match(html, /<meta name="robots" content="index,follow/);
  assert.ok(!response.headers.get('x-robots-tag')?.includes('noindex'));
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${pathname}: single H1`);
  assert.ok(locations.some((location) => new URL(location).href === new URL(pathname, canonicalOrigin).href), `${pathname}: sitemap`);
  const schema = JSON.parse(document('script[type="application/ld+json"]').text() || 'null');
  assert.ok(schema?.['@graph']?.length, `${pathname}: schema`);
  const greek = pathname.startsWith('/el/') || pathname.startsWith('/podcast/');
  assert.ok(html.includes(`<html lang="${greek ? 'el' : 'en'}">`), `${pathname}: language`);
  const destination = pathname.replace(/^\/el\//, '/').slice(1);
  if (pathname.includes('/services/') || pathname.endsWith('/studio') || destinations.includes(destination)) {
    const englishPath = greek ? pathname.slice(3) : pathname;
    for (const [language, alternatePath] of [['en', englishPath], ['el', `/el${englishPath}`]]) {
      assert.ok(html.includes(`hreflang="${language}" href="${canonicalOrigin}${alternatePath}"`), `${pathname}: reciprocal ${language}`);
    }
    assert.ok(html.includes('href="/services') || html.includes('href="/el/services'), `${pathname}: internal service links`);
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
  if (newsPaths.includes(pathname)) {
    const article = schema['@graph'].find((node) => node['@type'] === 'BlogPosting');
    assert.equal(article?.url, `${canonicalOrigin}${pathname}`, `${pathname}: article schema`);
    assert.ok(Date.parse(article.datePublished) <= Date.now(), `${pathname}: publication is due`);
    assert.equal(document('meta[property="article:published_time"]').attr('content'), article.datePublished);
    assert.ok(article.dateModified && article.headline && article.publisher);
  }
  console.log(`PASS ${pathname}`);
}

for (const pathname of targetPaths.filter((entry) => entry !== '/' && entry !== '/el/')) {
  const response = await fetch(`${base}${pathname}/?source=seo-check`, { redirect: 'manual' });
  assert.equal(response.status, 301, `${pathname}: slash redirect`);
  assert.equal(response.headers.get('location'), `${pathname}?source=seo-check`);
}
for (const pathname of ['/services/does-not-exist', '/work/does-not-exist', '/news/does-not-exist', '/el/news/does-not-exist']) {
  const missing = await fetch(`${base}${pathname}`);
  assert.equal(missing.status, 404, pathname);
  assert.match(await missing.text(), /noindex,nofollow/);
}
const robots = await (await fetch(`${base}/robots.txt`)).text();
assert.ok(robots.includes('Disallow: /studio/'));
assert.ok(robots.includes('Disallow: /api/'));
console.log(`PASS ${targetPaths.length} canonical pages, slash redirects, genuine 404 and private-route robots rules`);