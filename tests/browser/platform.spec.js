import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { load } from 'cheerio';
import { readFile } from 'node:fs/promises';
import { getServicePath, servicePages } from '../../public/scripts/modules/service-pages.js';

test('public locales fit and optional tracking stays off until consent', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const route of ['/', '/el/', '/studio', '/el/studio', '/privacy', '/el/privacy']) {
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('#google-analytics-tag').count()).toBe(0);
    if (route === '/' || route === '/el/') {
      if (await page.locator('[data-consent-reject]').isVisible()) await page.locator('[data-consent-reject]').click();
      await page.screenshot({ path: testInfo.outputPath(route === '/' ? 'home-en.png' : 'home-el.png') });
    }
  }
  expect(errors).toEqual([]);
});

test('brand menu contains keyboard focus and restores its opener', async ({ page }) => {
  for (const route of ['/', '/el/']) {
    await page.goto(route);
    const consent = page.locator('[data-consent-reject]');
    if (await consent.isVisible()) await consent.click();
    const opener = page.locator('#cinema-menu > summary');
    await opener.click();
    const menu = page.locator('#cinema-menu-sheet');
    const close = menu.locator('[data-cinema-menu-close]');
    const last = menu.locator('a[href]').last();
    await expect(close).toBeFocused();
    await close.press('Shift+Tab');
    await expect(last).toBeFocused();
    await last.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(opener).toBeFocused();
    await expect(page.locator('#main-content')).not.toHaveAttribute('inert');
    await opener.click();
    await close.click();
    await expect(menu).toBeHidden();
    await expect(opener).toBeFocused();
  }
});

test('destination pages provide bilingual navigation, readable layouts and working work filters', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const locale of ['en', 'el']) {
    for (const key of ['work', 'services', 'about', 'contact', 'press', 'podcast', 'news']) {
      await page.goto(`${locale === 'el' ? '/el' : ''}/${key}`);
      await expect(page.locator('main h1')).toBeVisible();
      expect(await page.locator('h1').count()).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('.cinema-footer a[href$="/news"]')).toBeAttached();
      if (key === 'services') {
        await expect(page.locator('.cinema-overview-content > .cinema-service-list > li')).toHaveCount(6);
        await expect(page.locator('.cinema-support .cinema-service-list > li')).toHaveCount(7);
      }
      if (key === 'work') {
        await page.locator('#work-search').fill('No film matches this unique query');
        await expect(page.locator('#work-no-results')).toBeVisible();
        await page.locator('#work-search').fill('');
        await expect(page.locator('#work-no-results')).toBeHidden();
      }
      if (locale === 'en' && key === 'services') await page.screenshot({ path: testInfo.outputPath('services-index.png'), fullPage: true });
    }
  }
  expect(errors).toEqual([]);
});

test('responsive cinematic typography fits all required screen widths', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Explicit width matrix runs once; other projects cover native mobile engines.');
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [1920, 1440, 1280, 1024, 768, 430, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/', '/el/', '/el/services/film-documentary-production']) {
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width} ${route}`).toBe(true);
      const bounds = await page.locator('h1').evaluate((heading) => {
        const range = document.createRange(); range.selectNodeContents(heading);
        const rectangle = range.getBoundingClientRect(); return { left: rectangle.left, right: rectangle.right };
      });
      expect(bounds.left, `${width} ${route} left`).toBeGreaterThanOrEqual(-1);
      expect(bounds.right, `${width} ${route} right`).toBeLessThanOrEqual(width + 1);
    }
  }
});

test('studio gallery supports keyboard navigation, dismissal and focus restoration', async ({ page }, testInfo) => {
  for (const locale of ['en', 'el']) {
    await page.goto(`${locale === 'el' ? '/el' : ''}/studio`);
    const first = page.locator('[data-gallery-image]').first();
    await first.click();
    const dialog = page.getByRole('dialog', { name: locale === 'el' ? 'Συλλογή εικόνων' : 'Image gallery', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[aria-live]')).toHaveText('1 / 3');
    await page.keyboard.press('ArrowRight');
    await expect(dialog.locator('[aria-live]')).toHaveText('2 / 3');
    await expect(dialog.locator('img')).toBeVisible();
    expect(await dialog.locator('img').evaluate((image) => image.complete && image.naturalWidth > 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`studio-gallery-${locale}.png`) });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(first).toBeFocused();
    await expect(page.locator('#studio-enquiry #inquiry-crew')).toBeAttached();
  }
});

test('showreel opens on demand, contains keyboard focus and restores the trigger', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-consent-reject]').click();
  const trigger = page.locator('[data-open-reel]').first();
  await expect(page.locator('#reel-player-video')).not.toHaveAttribute('src');
  await trigger.click();
  await expect(page.locator('#reel-player')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#reel-player button[data-close-reel]')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await page.locator('#reel-player').evaluate((player) => player.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Tab');
  expect(await page.locator('#reel-player').evaluate((player) => player.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#reel-player')).toHaveAttribute('aria-hidden', 'true');
  await expect(trigger).toBeFocused();
  expect(await page.locator('main').evaluate((main) => main.inert)).toBe(false);
});

test('brand inquiry errors focus a summary and preserve the brief after a failed request', async ({ page }) => {
  await page.goto('/contact');
  await page.locator('[data-consent-reject]').click();
  await page.locator('#inquiry-name').fill('Film producer');
  await page.locator('#inquiry-email').fill('not-an-email');
  await page.locator('#inquiry-type').selectOption('music-videos');
  await page.locator('#inquiry-message').fill('A music video production in Athens, with studio filming.');
  await page.locator('#inquiry-privacy').check();
  let requests = 0;
  await page.route('**/api/contact', async (route) => { requests++; await route.fulfill({ status: 503, json: { error: 'Temporarily unavailable' } }); });
  await page.locator('#inquiry-form [type="submit"]').click();
  await expect(page.locator('#inquiry-errors')).toBeFocused();
  await expect(page.locator('#inquiry-email')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#inquiry-errors')).toContainText('@');
  expect(requests).toBe(0);
  await page.locator('#inquiry-errors a[href="#inquiry-email"]').click();
  await expect(page.locator('#inquiry-email')).toBeFocused();
  await page.locator('#inquiry-email').fill('producer@example.invalid');
  await page.locator('#inquiry-form [type="submit"]').click();
  await expect(page.locator('#inquiry-status')).toContainText('could not be sent');
  await expect(page.locator('#inquiry-name')).toHaveValue('Film producer');
  await expect(page.locator('#inquiry-type')).toHaveValue('music-videos');
  await expect(page.locator('#inquiry-message')).toHaveValue(/studio filming/);
  await expect(page.locator('#inquiry-errors')).toBeHidden();
  expect(requests).toBe(1);
});

test('Greek inquiry submits once with explicit consent and shows a real receipt', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/el/');
  await page.locator('[data-consent-reject]').click();
  await page.locator('#inquiry-name').fill('Browser test person');
  await page.locator('#inquiry-email').fill('browser@example.invalid');
  await page.locator('#inquiry-message').fill('We would like to discuss our next film production in Athens.');
  await page.locator('#inquiry-privacy').check();
  const response = page.waitForResponse((value) => value.url().endsWith('/api/contact') && value.request().method() === 'POST');
  await page.locator('#inquiry-form [type="submit"]').click();
  expect((await response).status()).toBe(201);
  await expect(page.locator('#inquiry-status')).toContainText('Λάβαμε το αίτημά σας');
  await expect(page.locator('#inquiry-name')).toHaveValue('');
});

test('admin sign-in, draft isolation and publication work through the real UI', async ({ page }, testInfo) => {
  await page.goto('/admin');
  await page.getByLabel('Email', { exact: true }).fill('preview@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('local-preview-only-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  const violations = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations;
  expect(violations.map((entry) => ({ id: entry.id, nodes: entry.nodes.map((node) => node.target) }))).toEqual([]);
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  const id = `browser-${testInfo.project.name}-${Date.now()}`;
  await page.getByLabel('Project title', { exact: true }).fill('Browser publishing test');
  await page.getByLabel('URL identifier', { exact: true }).fill(id);
  await page.getByLabel('Short description', { exact: true }).fill('An isolated project for the browser publishing regression.');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('#save-state')).toContainText('Draft saved');
  expect((await page.request.get(`/work/${id}`)).status()).toBe(404);
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.locator(`[data-project-row]:has([data-edit-project="${id}"]) .badge`)).toHaveText('published');
  expect((await page.request.get(`/work/${id}`)).status()).toBe(200);
});

test('admin and public pages have no automated accessibility violations', async ({ page }) => {
  test.setTimeout(180000);
  const { projects } = await (await page.request.get('/api/projects')).json();
  const services = servicePages.flatMap((service) => ['en', 'el'].map((language) => getServicePath(service, language)));
  const destinations = ['work', 'services', 'about', 'contact', 'press', 'podcast', 'news'].flatMap((key) => [`/${key}`, `/el/${key}`]);
  const findings = [];
  for (const route of ['/admin', '/privacy', '/el/privacy', '/', '/el/', '/studio', '/el/studio', ...destinations, ...services, ...projects.slice(0, 1).map((project) => `/work/${project.id}`)]) {
    await page.goto(route);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    findings.push(...result.violations.map((entry) => ({ route, id: entry.id, nodes: entry.nodes.map((node) => node.target) })));
  }
  expect(findings).toEqual([]);
});

test('reduced motion gets a server-rendered real-film poster without downloading the hero video', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const videoRequests = [];
  page.on('request', (request) => { if (/\/media\/hero-video[^/]*\.mp4/.test(request.url())) videoRequests.push(request.url()); });
  await page.goto('/');
  await expect(page.locator('.hero-poster')).toBeVisible();
  expect(await page.locator('.hero-poster').evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(page.locator('#hero-video')).toHaveAttribute('preload', 'none');
  await expect(page.locator('#hero-video')).not.toHaveAttribute('src');
  expect(videoRequests).toEqual([]);
});

test('deferred story images load on scroll and remain usable without JavaScript', async ({ page, browser }) => {
  await page.goto('/');
  await page.locator('[data-consent-reject]').click();
  await page.locator('.tagline-story').scrollIntoViewIfNeeded();
  const first = page.locator('.tagline-story-image').first();
  await expect.poll(() => first.evaluate((image) => image.currentSrc.includes('/media/projects/') && image.naturalWidth > 1)).toBe(true);
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: new URL(page.url()).origin, viewport: page.viewportSize() });
  try {
    const fallback = await context.newPage();
    await fallback.goto('/');
    await fallback.locator('.tagline-story').scrollIntoViewIfNeeded();
    await expect.poll(() => fallback.locator('noscript .tagline-story-image').first().evaluate((image) => image.naturalWidth > 1)).toBe(true);
    await expect(fallback.locator('#work-browser a[href^="/work/"]').first()).toHaveCount(1);
  } finally { await context.close(); }
});

test('Greek legal controls show localized cookies and navigate to the canonical privacy notice', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/el/');
  await page.locator('#hero-video').waitFor({ state: 'attached' });
  await page.locator('.consent-banner__policy').click();
  await expect(page.locator('#panel-cookies').getByRole('heading', { name: 'Απαραίτητη αποθήκευση', exact: true })).toBeVisible();
  await page.locator('#panel-cookies .panel-close').click();
  await page.locator('[data-consent-reject]').click();
  await page.locator('.cinema-footer a[href$="#panel-terms"]').click();
  await expect(page.locator('#panel-terms')).toBeVisible();
  await page.locator('#panel-terms .panel-close').click();
  await page.goto('/el/contact');
  await page.locator('.cinema-footer a[href$="#panel-terms"]').click();
  await expect(page.locator('#panel-terms')).toBeVisible();
  await page.locator('#panel-terms .panel-close').click();
  await page.locator('a.legal-link[href="/el/privacy"]').click();
  await expect(page).toHaveURL(/\/el\/privacy$/);
  await expect(page.getByRole('heading', { name: 'Πολιτική απορρήτου', exact: true })).toBeVisible();
});

test('custom YouTube hero makes no third-party request until explicitly played', async ({ page }) => {
  const requests = [];
  await page.route('**/', async (route) => {
    const response = await route.fetch();
    const $ = load(await response.text());
    const settings = JSON.parse($('#public-settings').text());
    settings.videoSource = 'https://youtu.be/lINECZrijtg';
    settings.mobileVideoSource = settings.videoSource;
    $('#public-settings').text(JSON.stringify(settings));
    await route.fulfill({ response, body: $.html() });
  });
  await page.route(/https:\/\/(?:www\.)?(?:youtube(?:-nocookie)?\.com|ytimg\.com)\//, async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Controlled embed response</title>' });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play YouTube background', exact: true })).toBeVisible();
  expect(requests).toEqual([]);
  await expect(page.locator('#hero-media iframe')).toHaveCount(0);
  await page.locator('[data-consent-reject]').click();
  await page.getByRole('button', { name: 'Play YouTube background', exact: true }).click();
  await expect(page.locator('#hero-media iframe')).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/lINECZrijtg\?/);
  await expect.poll(() => requests.length).toBe(1);
  expect(requests.some((url) => url.includes('iframe_api'))).toBe(false);
});

const signIn = async (page) => {
  await page.goto('/admin');
  await page.getByLabel('Email', { exact: true }).fill('preview@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('local-preview-only-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
};

test('News editor saves, previews, publishes, schedules and removes an article without static HTML editing', async ({ page }, testInfo) => {
  page.on('dialog', (dialog) => dialog.accept());
  await signIn(page);
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('link', { name: 'News', exact: true }).click();
  await page.getByRole('button', { name: 'New article', exact: true }).click();
  const slug = `browser-news-${testInfo.project.name}-${Date.now()}`;
  await page.getByLabel('Headline', { exact: true }).fill('An isolated production update');
  await page.getByLabel('URL slug', { exact: true }).fill(slug);
  await page.getByLabel('Featured image', { exact: true }).fill('/media/studio/studio-frame-01.jpg');
  await page.getByLabel('Featured image alt text', { exact: true }).fill('A real studio view');
  await page.getByLabel('Publish at (Europe/Athens)', { exact: true }).fill('2020-01-01T12:00');
  await page.getByRole('textbox', { name: 'Article content', exact: true }).fill('A real editorial workflow tested in an isolated database.');
  const editorAccessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(editorAccessibility.violations.map((entry) => ({ id: entry.id, nodes: entry.nodes.map((node) => node.target) }))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('#news-save-state')).toContainText('Draft saved');
  expect((await page.request.get(`/news/${slug}`)).status()).toBe(404);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.frameLocator('iframe[title="Article draft preview"]').getByRole('heading', { name: 'An isolated production update', exact: true })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Publish / schedule', exact: true }).click();
  await expect(page.locator('#news-save-state')).toContainText('Published');
  expect((await page.request.get(`/news/${slug}`)).status()).toBe(200);
  const articlePage = await page.context().newPage();
  try {
    await articlePage.goto(`/news/${slug}`);
    await expect(articlePage.getByRole('heading', { level: 1 })).toHaveText('An isolated production update');
    const accessibility = await new AxeBuilder({ page: articlePage }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations.map((entry) => ({ id: entry.id, nodes: entry.nodes.map((node) => node.target) }))).toEqual([]);
    if (await articlePage.locator('[data-consent-reject]').isVisible()) await articlePage.locator('[data-consent-reject]').click();
    await articlePage.screenshot({ path: testInfo.outputPath('news-article.png'), fullPage: true });
    await articlePage.goto('/news');
    await expect(articlePage.getByRole('heading', { name: 'An isolated production update', exact: true })).toBeVisible();
    await articlePage.screenshot({ path: testInfo.outputPath('news-index.png'), fullPage: true });
  } finally { await articlePage.close(); }
  await page.getByLabel('Publish at (Europe/Athens)', { exact: true }).fill('2099-07-01T12:00');
  await page.getByRole('button', { name: 'Publish / schedule', exact: true }).click();
  await expect(page.locator('#news-save-state')).toContainText('Scheduled');
  expect((await page.request.get(`/news/${slug}`)).status()).toBe(404);
  await page.getByRole('button', { name: 'Unpublish', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unpublish', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Delete article', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New article', exact: true })).toBeVisible();
});

test('page draft preview, revisions, unpublish and delete work in the console', async ({ page }, testInfo) => {
  page.on('dialog', (dialog) => dialog.accept());
  await signIn(page);
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('link', { name: 'Pages', exact: true }).click();
  await page.getByRole('button', { name: 'New page', exact: true }).click();
  const id = `page-${testInfo.project.name}-${Date.now()}`;
  await page.getByLabel('Page title', { exact: true }).fill('First page heading');
  await page.getByLabel('URL identifier', { exact: true }).fill(id);
  await page.getByLabel('Body', { exact: true }).fill('A saved draft that is not public yet.');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('#page-save-state')).toContainText('Version');
  expect((await page.request.get(`/pages/${id}`)).status()).toBe(404);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.frameLocator('iframe[title="Page draft preview"]').getByRole('heading', { name: 'First page heading' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.locator(`[data-edit-page="en:${id}"]`).click();
  await expect(page.getByRole('button', { name: 'Unpublish', exact: true })).toBeVisible();
  expect((await page.request.get(`/pages/${id}`)).status()).toBe(200);
  await page.getByLabel('Page title', { exact: true }).fill('New private heading');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'New private heading', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Revisions', exact: true }).click();
  await page.getByRole('button', { name: 'Restore draft', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'First page heading', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Unpublish', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unpublish', exact: true })).toHaveCount(0);
  expect((await page.request.get(`/pages/${id}`)).status()).toBe(404);
  await page.getByRole('button', { name: 'Delete page', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New page', exact: true })).toBeVisible();
});

test('edits made while a project save is pending remain visibly unsaved', async ({ page }, testInfo) => {
  await signIn(page);
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page.getByLabel('Project title', { exact: true }).fill('Pending save project');
  await page.getByLabel('URL identifier', { exact: true }).fill(`pending-${testInfo.project.name}-${Date.now()}`);
  let release;
  let intercepted;
  const held = new Promise((resolve) => { release = resolve; });
  const requested = new Promise((resolve) => { intercepted = resolve; });
  let first = true;
  await page.route('**/api/admin/projects', async (route) => {
    if (first && route.request().method() === 'POST') { first = false; intercepted(); await held; }
    await route.continue();
  });
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await requested;
  await page.getByLabel('Short description', { exact: true }).fill('Newer text typed during the pending request.');
  release();
  await expect(page.locator('#save-state')).toHaveText('Newer changes not saved');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('#save-state')).toContainText('Draft saved');
  await expect(page.getByLabel('Short description', { exact: true })).toHaveValue('Newer text typed during the pending request.');
});

test('gallery and structured credits preserve the edited order', async ({ page }, testInfo) => {
  await signIn(page);
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  const id = `ordered-${testInfo.project.name}-${Date.now()}`;
  await page.getByLabel('Project title', { exact: true }).fill('Ordered production');
  await page.getByLabel('URL identifier', { exact: true }).fill(id);
  await page.getByRole('tab', { name: 'Greek', exact: true }).click();
  await page.getByLabel('Greek title', { exact: true }).fill('Greek production');
  await page.getByLabel('Greek short description', { exact: true }).fill('Greek description');
  await page.getByLabel('Greek social image', { exact: true }).fill('/assets/anchevlogo.png');
  await page.getByLabel('Exclude Greek project from search indexing', { exact: true }).check();
  await page.getByRole('tab', { name: 'Production', exact: true }).click();
  for (const suffix of ['first', 'second']) {
    await page.getByRole('button', { name: 'Add image', exact: true }).click();
    await page.getByLabel('Image URL', { exact: true }).last().fill(`/media/projects/anti-bullying/cover.webp?${suffix}`);
  }
  await page.locator('#project-gallery [data-ordered-row]').last().getByRole('button', { name: 'Move up', exact: true }).click();
  for (const name of ['First person', 'Second person']) {
    await page.getByRole('button', { name: 'Add credit', exact: true }).click();
    await page.getByLabel('Credit role', { exact: true }).last().fill('Production');
    await page.getByLabel('Credit name', { exact: true }).last().fill(name);
  }
  await page.locator('#project-credits [data-ordered-row]').last().getByRole('button', { name: 'Move up', exact: true }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('#save-state')).toContainText('Draft saved');
  const data = await (await page.request.get('/api/admin/projects')).json();
  const project = data.projects.find((entry) => entry.id === id);
  expect(project.frames.map((url) => url.split('?')[1])).toEqual(['second', 'first']);
  expect(project.credits.map((credit) => credit.name)).toEqual(['Second person', 'First person']);
  expect(project.translations.el.seo.image).toBe('/assets/anchevlogo.png');
  expect(project.translations.el.seo.noindex).toBe(true);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.locator(`[data-edit-project="${id}"]`).first().click();
  await page.getByRole('tab', { name: 'Greek', exact: true }).click();
  await expect(page.getByLabel('Greek social image', { exact: true })).toHaveValue('/assets/anchevlogo.png');
  await expect(page.getByLabel('Exclude Greek project from search indexing', { exact: true })).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('mobile background waits for a play action and native films can be paused', async ({ page }, testInfo) => {
  const films = [];
  const projectRequests = [];
  const deferredBackgrounds = [];
  page.on('request', (request) => { if (/hero-video.*\.mp4/.test(request.url())) films.push(request.url()); });
  page.on('request', (request) => { if (/\/api\/projects\?/.test(request.url())) projectRequests.push(request.url()); });
  page.on('request', (request) => { if (/contact-athens|menu-texture|story-ideas|story-planned|story-brought/.test(request.url())) deferredBackgrounds.push(request.url()); });
  await page.goto('/');
  const toggle = page.locator('#hero-background-toggle');
  await expect(toggle).toBeVisible();
  expect(projectRequests).toEqual([]);
  expect(deferredBackgrounds).toEqual([]);
  if (testInfo.project.use.isMobile) {
    expect(films).toEqual([]);
    expect(await page.locator('#hero-video').getAttribute('src')).toBeNull();
    const consent = page.getByRole('button', { name: 'Reject optional', exact: true });
    if (await consent.isVisible()) await consent.click();
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  const consent = page.getByRole('button', { name: 'Reject optional', exact: true });
  if (await consent.isVisible()) await consent.click();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(await page.locator('#hero-video').evaluate((video) => video.paused)).toBe(true);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(await page.locator('#hero-video').evaluate((video) => video.paused)).toBe(true);
});

test('retained originals can be restored and reprocessed through the media console', async ({ page }, testInfo) => {
  await signIn(page);
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('link', { name: 'Media library', exact: true }).click();
  const filename = `restore-${testInfo.project.name}.png`;
  const file = async (asset) => ({ name: filename, mimeType: 'image/png', buffer: await readFile(`public/assets/${asset}.png`) });
  const uploaded = page.waitForResponse((response) => response.url().endsWith('/api/admin/upload') && response.request().method() === 'POST');
  await page.locator('#media-upload').setInputFiles(await file('favicon-32'));
  const { asset: original } = await (await uploaded).json();
  const current = async () => (await (await page.request.get(`/api/admin/media?q=${filename}`)).json()).media.find((asset) => asset.id === original.id);
  const waitReady = () => expect.poll(async () => (await current())?.status, { timeout: 15000, intervals: [750, 1000] }).toBe('ready');
  await waitReady();
  await page.locator(`[data-media-details="${original.id}"]`).click();
  const replaced = page.waitForResponse((response) => response.url().endsWith(`/media/${original.id}/replace`) && response.request().method() === 'POST');
  await page.locator('#media-replace').setInputFiles(await file('apple-touch-icon'));
  expect((await replaced).status()).toBe(200);
  await waitReady();
  await page.locator(`[data-media-details="${original.id}"]`).click();
  await expect(page.getByRole('heading', { name: 'Original versions', exact: true })).toBeVisible();
  page.once('dialog', (confirmation) => confirmation.accept());
  const restored = page.waitForResponse((response) => response.url().endsWith(`/media/${original.id}/restore`) && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Restore original', exact: true }).click();
  const result = await restored;
  expect(result.status()).toBe(200);
  expect((await result.json()).asset.checksum).toBe(original.checksum);
  await waitReady();
  expect((await current()).url).toBe(original.url);
});

test('site content editors publish services, studio facts and contact copy without draft leaks', async ({ page }, testInfo) => {
  await signIn(page);
  for (const [template, id, path, selector] of [
    ['Video Production in Athens / EN', 'service-video-production-athens', '/services/video-production-athens', '#service-title'],
    ['Anchev Studio. / EN', 'studio', '/studio', '#studio-title'],
    ["Have something in mind? Let's make it. / EN", 'contact', '/', '.contact-final__title']
  ]) {
    const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
    if (await menu.isVisible()) await menu.click();
    await page.getByRole('link', { name: 'Pages', exact: true }).click();
    await page.getByRole('button', { name: 'Site content', exact: true }).click();
    await page.getByRole('button', { name: template, exact: true }).click();
    const title = `Editorial ${id} ${testInfo.project.name}`;
    await page.getByLabel('Page title', { exact: true }).fill(title);
    if (id === 'studio') await page.locator('[data-block]').filter({ has: page.locator('select option[value="fact"]:checked') }).first().getByLabel('Block text', { exact: true }).fill('14 m');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.locator('#page-save-state')).toContainText('Version');
    const publicBefore = await (await page.request.get(path)).text();
    expect(publicBefore).not.toContain(title);
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.frameLocator('iframe[title="Page draft preview"]').locator(selector)).toHaveText(title);
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    const published = await page.context().newPage();
    await published.goto(path);
    await expect(published.locator(selector)).toHaveText(title);
    if (id === 'studio') await expect(published.locator('.case-study__detail').first()).toContainText('14 m');
    if (id === 'contact') await expect(published.locator('#inquiry-form')).toHaveCount(1);
    expect(await published.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const consent = published.locator('[data-consent-reject]');
    if (await consent.isVisible()) await consent.click();
    if (id === 'contact') await published.locator('#contact-page').scrollIntoViewIfNeeded();
    await published.screenshot({ path: testInfo.outputPath(`editorial-${id}.png`) });
    await published.close();
  }
});

test('homepage copy and SEO settings save through the console in both locales', async ({ page }, testInfo) => {
  page.on('dialog', (dialog) => dialog.accept());
  await signIn(page);
  const original = await (await page.request.get('/api/admin/settings')).json();
  const publishedBefore = await (await page.request.get('/api/settings')).json();
  const { csrf } = await (await page.request.get('/api/admin/session')).json();
  try {
    const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
    if (await menu.isVisible()) await menu.click();
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    const stale = await page.context().newPage();
    await stale.goto('/admin#settings');
    await stale.getByLabel('Telephone', { exact: true }).waitFor();
    await page.getByLabel('Homepage social image', { exact: true }).fill('/assets/anchevlogo.png');
    await page.getByLabel('Exclude homepage from search indexing', { exact: true }).check();
    for (const language of ['en', 'el']) {
      await page.getByRole('tab', { name: `Homepage / ${language.toUpperCase()}`, exact: true }).click();
      await page.locator(`#panel-home-${language}`).getByLabel('Opening introduction', { exact: true }).fill(`${language} opening ${testInfo.project.name}`);
      await page.locator(`#panel-home-${language}`).getByLabel('Services introduction', { exact: true }).fill(`${language} services ${testInfo.project.name}`);
    }
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.locator('[role="status"]').filter({ hasText: 'Settings draft saved.' })).toBeVisible();
    expect(await (await page.request.get('/api/settings')).json()).toEqual(publishedBefore);
    await page.reload();
    await page.getByRole('tab', { name: 'Business', exact: true }).waitFor();
    await expect(page.getByLabel('Homepage social image', { exact: true })).toHaveValue('/assets/anchevlogo.png');
    await expect(page.getByLabel('Exclude homepage from search indexing', { exact: true })).toBeChecked();
    const consentBeforePreview = await page.evaluate(() => {
      const previous = localStorage.getItem('anchev-consent-v1');
      localStorage.setItem('anchev-consent-v1', JSON.stringify({ analytics: true, advertising: true }));
      return previous;
    });
    for (const language of ['en', 'el']) {
      await page.getByRole('button', { name: `Preview / ${language.toUpperCase()}`, exact: true }).click();
      const preview = page.frameLocator('iframe[title="Settings preview"]');
      await preview.locator('#hero-video').waitFor({ state: 'attached' });
      await expect(preview.locator('.hero-positioning')).toHaveText(`${language} opening ${testInfo.project.name}`);
      await expect(preview.locator('#services-page .experience-heading > p:last-child')).toHaveText(`${language} services ${testInfo.project.name}`);
      await expect(preview.locator('.language-switch a[lang="el"]')).toHaveAttribute('href', /\/api\/admin\/settings\/preview.html\?version=\d+&path=%2Fel%2F/);
      await expect(preview.locator('#google-analytics-tag')).toHaveCount(0);
      await expect(preview.locator('#inquiry-form [type="submit"]')).toBeDisabled();
      await expect(preview.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow,noarchive');
      await page.screenshot({ path: testInfo.outputPath(`settings-preview-${language}.png`) });
      for (const target of ['el', 'en']) {
        const navigation = page.waitForEvent('framenavigated', { predicate: (frame) => frame.parentFrame() === page.mainFrame() && new URL(frame.url()).searchParams.get('path') === (target === 'el' ? '/el/' : '/') });
        await preview.locator(`.language-switch a[lang="${target}"]`).click();
        await (await navigation).waitForLoadState('domcontentloaded');
        await expect(preview.locator('.hero-positioning')).toHaveText(`${target} opening ${testInfo.project.name}`);
      }
      const studioLink = preview.locator('.cinema-nav a[href*="path=%2Fstudio"]');
      const studioUrl = await studioLink.getAttribute('href');
      const studio = await page.request.get(studioUrl);
      expect(studio.status()).toBe(200);
      expect(studio.headers()['x-robots-tag']).toBe('noindex,nofollow,noarchive');
      await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    }
    await page.evaluate((previous) => {
      if (previous === null) localStorage.removeItem('anchev-consent-v1');
      else localStorage.setItem('anchev-consent-v1', previous);
    }, consentBeforePreview);
    expect(await (await page.request.get('/api/settings')).json()).toEqual(publishedBefore);
    await page.getByRole('button', { name: 'Publish settings', exact: true }).click();
    await expect(page.locator('[role="status"]').filter({ hasText: 'Settings published.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish settings', exact: true })).toHaveCount(0);
    const publicPage = await page.context().newPage();
    for (const language of ['en', 'el']) {
      await publicPage.goto(language === 'en' ? '/' : '/el/');
      await publicPage.locator('#hero-video').waitFor({ state: 'attached' });
      await expect(publicPage.locator('.hero-positioning')).toHaveText(`${language} opening ${testInfo.project.name}`);
      await expect(publicPage.locator('#services-page .experience-heading > p:last-child')).toHaveText(`${language} services ${testInfo.project.name}`);
      await expect(publicPage.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
      expect(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await publicPage.close();
    await stale.getByLabel('Telephone', { exact: true }).fill('Unsaved stale-tab number');
    await stale.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(stale.locator('[role="status"]').filter({ hasText: 'This entry changed' })).toBeVisible();
    await expect(stale.getByLabel('Telephone', { exact: true })).toHaveValue('Unsaved stale-tab number');
    expect((await (await page.request.get('/api/admin/settings')).json()).contact.phone).toBe(original.contact.phone);
    await stale.close();
    const publishedAfter = await (await page.request.get('/api/settings')).json();
    await page.getByRole('button', { name: 'Revisions', exact: true }).click();
    await page.getByRole('button', { name: 'Restore settings', exact: true }).first().click();
    await expect(page.locator('[role="status"]').filter({ hasText: 'Settings restored as a draft.' })).toBeVisible();
    await expect(page.getByLabel('Homepage social image', { exact: true })).toHaveValue(original.seo?.image || '');
    await expect(page.getByLabel('Exclude homepage from search indexing', { exact: true })).toBeChecked({ checked: Boolean(original.seo?.noindex) });
    const restored = await (await page.request.get('/api/admin/settings')).json();
    expect(restored.homepage || {}).toEqual(original.homepage || {});
    expect(await (await page.request.get('/api/settings')).json()).toEqual(publishedAfter);
    expect((await (await page.request.get('/api/admin/settings/revisions')).json()).revisions.length).toBeGreaterThanOrEqual(2);
    await page.getByRole('button', { name: 'Discard draft', exact: true }).click();
    await expect(page.locator('[role="status"]').filter({ hasText: 'Settings draft discarded.' })).toBeVisible();
    await expect(page.getByLabel('Homepage social image', { exact: true })).toHaveValue('/assets/anchevlogo.png');
    expect(await (await page.request.get('/api/settings')).json()).toEqual(publishedAfter);
  } finally {
    const { version } = await (await page.request.get('/api/admin/settings')).json();
    const response = await page.request.post('/api/admin/settings', { headers: { 'x-csrf-token': csrf, origin: new URL(page.url()).origin }, data: { ...original, version, homepage: original.homepage || {}, seo: original.seo || { title: '', description: '', image: '', noindex: false } } });
    expect(response.status()).toBe(200);
    const draft = await response.json();
    const published = await page.request.post('/api/admin/settings/publish', { headers: { 'x-csrf-token': csrf, origin: new URL(page.url()).origin }, data: { version: draft.version } });
    expect(published.status()).toBe(200);
  }
});