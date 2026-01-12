import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1400, height: 900 }
      },
    },
    {
      name: 'chromium-large-tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1000, height: 768 }
      },
    },
    {
      name: 'chromium-tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 800, height: 1024 }
      },
    },
    {
      name: 'chromium-mobile-landscape',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 600, height: 400 }
      },
    },
    {
      name: 'chromium-mobile-portrait',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 400, height: 700 }
      },
    },
    {
      name: 'chromium-small-mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 640 }
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
