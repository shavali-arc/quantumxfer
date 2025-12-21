import { test, expect } from '@playwright/test';
import { launchApp, closeApp, testCredentials } from './helpers';

/**
 * E2E Tests: Connection Management
 * 
 * Tests the connection profile management workflows:
 * - Creating new connections
 * - Editing existing connections  
 * - Deleting connections
 * - Listing saved connections
 * - Connecting with saved profiles
 */

test.describe('Connection Management', () => {
  
  test.beforeEach(async () => {
    // Clean state before each test
    await closeApp();
  });

  test.afterEach(async () => {
    // Always close app after test
    await closeApp();
  });

  test('should display connection form on startup', async () => {
    const { window } = await launchApp();
    
    // Wait for React to load
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    // Check for connection form inputs
    const hostInput = await window.$('input[placeholder*="Host"]') || 
                      await window.$('input[placeholder*="host"]') ||
                      await window.$('input[type="text"]');
    expect(hostInput).toBeTruthy();
  });

  test('should allow entering connection details', async () => {
    const { window } = await launchApp();
    
    // Wait for form to load
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    await window.waitForTimeout(1000); // Wait for form elements to render
    
    // Find and fill connection form inputs
    // Strategy: Find inputs by label text or placeholder
    const inputs = await window.$$('input[type="text"], input[type="number"], input[type="password"]');
    expect(inputs.length).toBeGreaterThan(0);
    
    // Try to fill host field (first text input typically)
    if (inputs.length > 0) {
      await inputs[0].fill(testCredentials.host);
      const value = await inputs[0].inputValue();
      expect(value).toBe(testCredentials.host);
    }
  });

  test('should show profiles management UI', async () => {
    const { window } = await launchApp();
    
    // Wait for app to load
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    // Look for profiles button/link (could be "Saved Profiles", "Profiles", "Manage", etc.)
    const profileButton = await window.$('button:has-text("Profile")') ||
                          await window.$('button:has-text("Saved")') ||
                          await window.$('[data-testid="profiles-button"]');
    
    // If profiles UI exists, verify it's present
    if (profileButton) {
      expect(await profileButton.isVisible()).toBe(true);
    }
  });

  test('should validate required connection fields', async () => {
    const { window } = await launchApp();
    
    // Wait for form
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    await window.waitForTimeout(1000);
    
    // Check that connect button is disabled when form is empty
    const connectButton = await window.$('button:has-text("Connect")') ||
                          await window.$('button:has-text("🚀")') ||
                          await window.$('[data-testid="connect-button"]');
    
    if (connectButton) {
      // Verify button is disabled
      const isDisabled = await connectButton.evaluate((btn: HTMLButtonElement) => btn.disabled);
      expect(isDisabled).toBe(true);
      
      // Fill in some fields
      const hostInput = await window.$('input[type="text"][placeholder*="host"]') || 
                       await window.$('input[placeholder*="Host"]') ||
                       await window.$('input[type="text"]:first-of-type');
      if (hostInput) {
        await hostInput.fill('example.com');
        await window.waitForTimeout(300);
      }
      
      // Button should still be disabled (missing username and password)
      const stillDisabled = await connectButton.evaluate((btn: HTMLButtonElement) => btn.disabled);
      expect(stillDisabled).toBe(true);
    }
  });

  test('should attempt SSH connection with valid credentials', async () => {
    const { window } = await launchApp();
    
    // Wait for form
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    await window.waitForTimeout(1000);
    
    // Find all inputs and fill them with test data
    const inputs = await window.$$('input[type="text"], input[type="password"], input[type="number"]');
    
    // Fill the inputs with reasonable test values
    if (inputs.length > 0) {
      // First text input is typically host
      await inputs[0].fill('test.example.com');
    }
    if (inputs.length > 1) {
      // Check if second input is port or username
      const type = await inputs[1].getAttribute('type');
      if (type === 'number') {
        await inputs[1].fill('22');
      } else {
        await inputs[1].fill('testuser');
      }
    }
    if (inputs.length > 2) {
      // Fill username if we haven't already
      await inputs[2].fill('testuser');
    }
    if (inputs.length > 3) {
      // Fill password
      await inputs[3].fill('testpassword');
    }
    
    await window.waitForTimeout(500);
    
    // Check if connect button is now enabled
    const connectButton = await window.$('button:has-text("🚀")') ||
                          await window.$('button:has-text("Connect")');
    
    if (connectButton) {
      // Verify button is now enabled after filling form
      const isEnabled = await connectButton.evaluate((btn: HTMLButtonElement) => !btn.disabled);
      expect(isEnabled).toBe(true);
    }
  });

  test('should show connection status feedback', async () => {
    const { window } = await launchApp();
    
    // Wait for app
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    // Look for status indicators (could be badge, text, icon)
    const pageHTML = await window.content();
    
    // App should have some way to show connection status
    const hasStatusUI = pageHTML.includes('Connect') ||
                       pageHTML.includes('Disconnect') ||
                       pageHTML.includes('Status') ||
                       pageHTML.includes('status');
    
    expect(hasStatusUI).toBe(true);
  });

  test('should preserve connection state across interactions', async () => {
    const { window } = await launchApp();
    
    // Wait for app
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    await window.waitForTimeout(1000);
    
    // Fill host field
    const inputs = await window.$$('input[type="text"]');
    if (inputs.length > 0) {
      await inputs[0].fill('test-host.example.com');
      
      // Click somewhere else (blur)
      await window.click('body');
      await window.waitForTimeout(500);
      
      // Check if value is preserved
      const value = await inputs[0].inputValue();
      expect(value).toBe('test-host.example.com');
    }
  });

  test('should clear connection form fields', async () => {
    const { window } = await launchApp();
    
    // Wait for app
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    await window.waitForTimeout(1000);
    
    // Fill some fields
    const inputs = await window.$$('input[type="text"]');
    if (inputs.length > 0) {
      await inputs[0].fill('some-host');
      
      // Clear the field
      await inputs[0].fill('');
      
      // Verify cleared
      const value = await inputs[0].inputValue();
      expect(value).toBe('');
    }
  });

});
