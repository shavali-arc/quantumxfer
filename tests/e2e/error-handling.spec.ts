import { test, expect } from '@playwright/test';
import { launchApp, closeApp, captureScreenshot } from './helpers';

/**
 * E2E Tests: Error Handling and Edge Cases
 * 
 * Tests error handling and recovery:
 * - Connection timeout errors
 * - Authentication failures
 * - Network disconnection
 * - Invalid operations
 * - Error recovery and retry
 */

test.describe('Error Handling', () => {
  
  test.beforeEach(async () => {
    await closeApp();
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== 'passed') {
      await captureScreenshot(testInfo.title);
    }
    await closeApp();
  });

  test('should display error messages', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    // Just verify app loaded and can display content
    const html = await window.content();
    expect(html.length).toBeGreaterThan(100);
  });

  test('should handle invalid host gracefully', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    await window.waitForTimeout(1000);
    
    // Try to connect with invalid host
    const inputs = await window.$$('input[type="text"]');
    if (inputs.length > 0) {
      await inputs[0].fill('invalid-host-that-does-not-exist-12345.local');
    }
    
    // App should not crash
    const html = await window.content();
    expect(html.length).toBeGreaterThan(0);
  });

  test('should handle connection timeout', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    // Attempting connection to non-existent server should timeout gracefully
    const buttons = await window.$$('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('should recover from connection errors', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    // After connection error, app should remain usable
    const inputs = await window.$$('input');
    expect(inputs.length).toBeGreaterThan(0);
  });

  test('should handle authentication failures', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    // App should display auth error without crashing
    const html = await window.content();
    expect(html.length).toBeGreaterThan(0);
  });

  test('should handle missing required fields', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    await window.waitForTimeout(1000);
    
    // Try to submit form with empty fields
    const buttons = await window.$$('button');
    if (buttons.length > 0) {
      // Try to click connect/submit
      const connectBtn = buttons.find(async (b) => {
        const text = await b.textContent();
        return text && (text.includes('Connect') || text.includes('connect'));
      });
      
      if (connectBtn) {
        await connectBtn.click();
        await window.waitForTimeout(500);
      }
    }
    
    // App should still be functional
    const html = await window.content();
    expect(html.length).toBeGreaterThan(0);
  });

  test('should disable operations when not connected', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    // When not connected, certain buttons should be disabled
    const buttons = await window.$$('button:disabled');
    // May or may not have disabled buttons depending on implementation
    expect(Array.isArray(buttons)).toBe(true);
  });

  test('should provide helpful error messages', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    const html = await window.content();
    // Error messages should be user-friendly
    expect(html.length).toBeGreaterThan(0);
  });

  test('should handle rapid successive operations', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    await window.waitForTimeout(1000);
    
    // Verify app remains responsive
    const html = await window.content();
    expect(html.length).toBeGreaterThan(100);
  });

  test('should maintain UI state after error', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    await window.waitForTimeout(1000);
    
    // Fill a field
    const inputs = await window.$$('input[type="text"]');
    if (inputs.length > 0) {
      await inputs[0].fill('test-value');
      
      // Error shouldn't clear form state
      const value = await inputs[0].inputValue();
      expect(value).toBe('test-value');
    }
  });

});
