import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3012', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }
  ],
  webServer: {
    command: 'npm run preview',
    env: { PORT: '3012', MEDIA_WORKER: '0', PODCAST_FEED_URL: 'http://127.0.0.1:1/unavailable', PREVIEW_DATA_DIR: '' },
    url: 'http://127.0.0.1:3012/health',
    reuseExistingServer: false,
    timeout: 30000
  }
});