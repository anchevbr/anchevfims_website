import { defineConfig, devices } from '@playwright/test';

const settingsWorkflow = /homepage copy and SEO settings/;

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3012', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', grepInvert: settingsWorkflow, use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:3012' } },
    { name: 'mobile', grepInvert: settingsWorkflow, use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', baseURL: 'http://127.0.0.1:3013' } },
    { name: 'webkit', grepInvert: settingsWorkflow, use: { ...devices['iPhone 13'], defaultBrowserType: 'webkit', baseURL: 'http://127.0.0.1:3014' } },
    ...['desktop', 'mobile', 'webkit'].map((name, index) => ({
      name: `${name}-settings`, grep: settingsWorkflow,
      use: { ...devices[name === 'desktop' ? 'Desktop Chrome' : 'iPhone 13'], defaultBrowserType: name === 'webkit' ? 'webkit' : 'chromium', baseURL: `http://127.0.0.1:${3017 + index}` }
    }))
  ],
  webServer: [3012, 3013, 3014, 3017, 3018, 3019].map((port) => ({
    command: 'npm run preview',
    env: { PORT: String(port), BUNDLE_PUBLIC_ASSETS: '1', MEDIA_WORKER: '1', PODCAST_FEED_URL: 'http://127.0.0.1:1/unavailable', PREVIEW_DATA_DIR: '' },
    url: `http://127.0.0.1:${port}/health`,
    reuseExistingServer: false,
    timeout: 30000
  }))
});