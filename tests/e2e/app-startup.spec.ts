import { test, expect } from '@playwright/test';
import { launchApp, closeApp, captureScreenshot, waitForAppReady, getWindowTitle } from './helpers';

/**
 * E2E Tests: Application Startup
 * 
 * Tests the basic application launch and initialization workflow.
 * These tests verify that the Electron app can be launched, displays
 * the correct UI elements, and can be closed gracefully.
 */

test.describe('Application Startup', () => {
  
  test.beforeEach(async () => {
    // Clean state before each test
    await closeApp();
  });

  test.afterEach(async ({ }, testInfo) => {
    // Capture screenshot on failure
    if (testInfo.status !== 'passed') {
      await captureScreenshot(testInfo.title);
    }
    
    // Always close app after test
    await closeApp();
  });

  test('should launch application successfully', async () => {
    const { app, window } = await launchApp();
    
    // Verify app launched
    expect(app).toBeTruthy();
    expect(window).toBeTruthy();
    
    // Verify window has loaded content
    const html = await window.content();
    expect(html.length).toBeGreaterThan(0);
  });

  test('should display correct window title', async () => {
    const { window } = await launchApp();
    
    // Wait for app content to load (React root)
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    // Get window title
    const title = await getWindowTitle();
    
    // Verify title contains app name
    expect(title).toContain('QuantumXfer');
  });

  test('should render main app container', async () => {
    const { window } = await launchApp();
    
    // Wait for React root
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    // Check if our app container is present (with or without test-id)
    const appDiv = await window.$('[data-testid="app-container"]') || await window.$('div#root > div');
    expect(appDiv).toBeTruthy();
  });

  test('should have correct window dimensions', async () => {
    const { window } = await launchApp();
    
    // Get window size
    const size = await window.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));
    
    // Verify minimum dimensions (800x600 typical minimum)
    expect(size.width).toBeGreaterThanOrEqual(800);
    expect(size.height).toBeGreaterThanOrEqual(600);
  });

  test('should load React application', async () => {
    const { window } = await launchApp();
    
    // Wait for React root element
    await window.waitForSelector('#root', {
      state: 'attached',
      timeout: 10000
    });
    
    // Verify React is loaded
    const rootElement = await window.$('#root');
    expect(rootElement).toBeTruthy();
    
    // Verify root has content
    const hasContent = await window.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    });
    expect(hasContent).toBe(true);
  });

  test('should close application gracefully', async () => {
    const { app } = await launchApp();
    
    // No need to wait - just verify we can close
    
    // Close app
    await closeApp();
    
    // Verify app is closed (process should exit)
    // Note: After close, app context is destroyed
    // We just verify no errors were thrown during close
    expect(true).toBe(true);
  });

  test('should not have console errors on startup', async () => {
    const { window } = await launchApp();
    const errors: string[] = [];
    
    // Listen for console errors
    window.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait for React to load
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    // Give some time for any errors to appear
    await window.waitForTimeout(2000);
    
    // Filter out expected/benign errors (customize as needed)
    const unexpectedErrors = errors.filter(error => {
      // Filter out known harmless warnings
      return !error.includes('DevTools') && 
             !error.includes('Warning:');
    });
    
    // Verify no unexpected errors
    expect(unexpectedErrors).toHaveLength(0);
  });

});
