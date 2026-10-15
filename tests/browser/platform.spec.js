import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});