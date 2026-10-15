import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3012', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:3012' } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', baseURL: 'http://127.0.0.1:3013' } },
    { name: 'webkit', use: { ...devices['iPhone 13'], defaultBrowserType: 'webkit', baseURL: 'http://127.0.0.1:3014' } }
  ],
  webServer: [3012, 3013, 3014].map((port) => ({
    command: 'npm run preview',
    env: { PORT: String(port), BUNDLE_PUBLIC_ASSETS: '1', MEDIA_WORKER: '1', PODCAST_FEED_URL: 'http://127.0.0.1:1/unavailable', PREVIEW_DATA_DIR: '' },
    url: `http://127.0.0.1:${port}/health`,
    reuseExistingServer: false,
    timeout: 30000
  }))
});