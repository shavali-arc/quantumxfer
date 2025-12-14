import { defineConfig } from '@playwright/test';

/**
 * Playwright Configuration for Electron E2E Testing
 * 
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // Maximum time one test can run (30s for E2E)
  timeout: 30 * 1000,
  
  // Test execution settings
  fullyParallel: false, // Run tests serially for Electron
  forbidOnly: !!process.env.CI, // Fail if test.only in CI
  retries: process.env.CI ? 2 : 1, // Retry on CI
  workers: 1, // Single worker for Electron tests
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/e2e-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['list']
  ],
  
  // Shared settings for all tests
  use: {
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Collect trace on failure
    trace: 'on-first-retry',
    
    // Action timeout
    actionTimeout: 10 * 1000, // 10s
  },

  // Output folder for test artifacts
  outputDir: 'test-results/e2e-artifacts',

  // Expect options
  expect: {
    timeout: 5 * 1000, // 5s for assertions
  },

  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined,

  // Folder for test artifacts such as screenshots, videos, traces, etc.
  snapshotDir: './tests/e2e/__snapshots__',
});
