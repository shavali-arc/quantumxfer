import { test, expect, _electron as electron } from '@playwright/test';
import { ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * E2E Test Helpers for Electron Application
 */

let electronApp: ElectronApplication | null = null;
let mainWindow: Page | null = null;

/**
 * Launch the Electron application for testing
 */
export async function launchApp(): Promise<{ app: ElectronApplication; window: Page }> {
  if (electronApp && mainWindow) {
    return { app: electronApp, window: mainWindow };
  }

  // Launch Electron app
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../electron/main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ELECTRON_ENABLE_LOGGING: '1'
    }
  });

  // Wait for the main window (app shows splash first, then main window after 2s delay)
  // Get all windows and find the main one
  await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for splash + main window creation
  const windows = electronApp.windows();
  
  // Find the main window (not the splash)
  mainWindow = windows.find(win => {
    return win.url().includes('index.html') || win.url().includes('localhost');
  }) || windows[windows.length - 1]; // Fallback to last window
  
  // Wait for app to be ready
  await mainWindow.waitForLoadState('domcontentloaded');
  
  return { app: electronApp, window: mainWindow };
}

/**
 * Close the Electron application
 */
export async function closeApp() {
  if (mainWindow) {
    await mainWindow.close();
    mainWindow = null;
  }
  
  if (electronApp) {
    await electronApp.close();
    electronApp = null;
  }
}

/**
 * Take screenshot on test failure
 */
export async function captureScreenshot(testName: string) {
  if (mainWindow) {
    const screenshotPath = path.join(__dirname, `../../test-results/screenshots/${testName}.png`);
    await mainWindow.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved: ${screenshotPath}`);
  }
}

/**
 * Wait for element to be visible
 */
export async function waitForElement(selector: string, timeout: number = 5000): Promise<void> {
  if (!mainWindow) throw new Error('Main window not initialized');
  await mainWindow.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Click element with retry
 */
export async function clickElement(selector: string, retries: number = 3): Promise<void> {
  if (!mainWindow) throw new Error('Main window not initialized');
  
  for (let i = 0; i < retries; i++) {
    try {
      await mainWindow.click(selector);
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      await mainWindow.waitForTimeout(500);
    }
  }
}

/**
 * Type text into input field
 */
export async function typeText(selector: string, text: string): Promise<void> {
  if (!mainWindow) throw new Error('Main window not initialized');
  await mainWindow.fill(selector, text);
}

/**
 * Get text content of element
 */
export async function getText(selector: string): Promise<string> {
  if (!mainWindow) throw new Error('Main window not initialized');
  const element = await mainWindow.$(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);
  return await element.textContent() || '';
}

/**
 * Check if element exists
 */
export async function elementExists(selector: string): Promise<boolean> {
  if (!mainWindow) throw new Error('Main window not initialized');
  const element = await mainWindow.$(selector);
  return element !== null;
}

/**
 * Wait for application to be ready
 */
export async function waitForAppReady(timeout: number = 10000): Promise<void> {
  if (!mainWindow) throw new Error('Main window not initialized');
  
  // Wait for main app container to be visible
  await mainWindow.waitForSelector('[data-testid="app-container"]', { 
    state: 'visible', 
    timeout 
  });
}

/**
 * Get window title
 */
export async function getWindowTitle(): Promise<string> {
  if (!mainWindow) throw new Error('Main window not initialized');
  return await mainWindow.title();
}

/**
 * Evaluate JavaScript in the renderer process
 */
export async function evaluateInRenderer<T>(fn: () => T): Promise<T> {
  if (!mainWindow) throw new Error('Main window not initialized');
  return await mainWindow.evaluate(fn);
}

/**
 * Wait for navigation
 */
export async function waitForNavigation(timeout: number = 5000): Promise<void> {
  if (!mainWindow) throw new Error('Main window not initialized');
  await mainWindow.waitForLoadState('networkidle', { timeout });
}

/**
 * Test fixture for SSH connection credentials
 */
export const testCredentials = {
  host: '127.0.0.1',
  port: 2222,
  username: 'testuser',
  password: 'testpass'
};

/**
 * Reusable test configuration
 */
export const testConfig = {
  timeout: 30000, // 30 seconds for E2E tests
  retries: 2, // Retry flaky tests
  screenshotOnFailure: true
};
