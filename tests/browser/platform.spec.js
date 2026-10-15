import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { load } from 'cheerio';

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
  for (const route of ['/admin', '/privacy', '/el/privacy', '/', '/el/']) {
    await page.goto(route);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations.map((entry) => ({ id: entry.id, nodes: entry.nodes.map((node) => node.target) }))).toEqual([]);
  }
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

test('Greek legal controls show localized cookies and navigate to the canonical privacy notice', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/el/');
  await page.locator('#hero-video').waitFor({ state: 'attached' });
  await page.locator('.consent-banner__policy').click();
  await expect(page.locator('#panel-cookies').getByRole('heading', { name: 'Απαραίτητη αποθήκευση', exact: true })).toBeVisible();
  await page.locator('#panel-cookies .panel-close').click();
  await page.locator('[data-consent-reject]').click();
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
      await preview.locator('.language-switch a[lang="el"]').click();
      await expect(preview.locator('.hero-positioning')).toHaveText(`el opening ${testInfo.project.name}`);
      await preview.locator('.language-switch a[lang="en"]').click();
      await expect(preview.locator('.hero-positioning')).toHaveText(`en opening ${testInfo.project.name}`);
      const studioLink = preview.locator('.desktop-nav a[href*="path=%2Fstudio"]');
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