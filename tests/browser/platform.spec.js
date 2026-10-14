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