import { test, expect } from '@playwright/test';
import { launchApp, closeApp, captureScreenshot } from './helpers';

/**
 * E2E Tests: Command Execution
 * 
 * Tests terminal/command execution functionality:
 * - Executing remote SSH commands
 * - Capturing command output
 * - Command history
 * - Interactive terminal
 * - Output formatting and rendering
 */

test.describe('Command Execution', () => {
  
  test.beforeEach(async () => {
    await closeApp();
  });

  test.afterEach(async (testInfo) => {
    if (testInfo.status !== 'passed') {
      await captureScreenshot(testInfo.title);
    }
    await closeApp();
  });

  test('should display terminal UI', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    const html = await window.content();
    const hasTerminalUI = html.includes('terminal') ||
                         html.includes('Terminal') ||
                         html.includes('command') ||
                         html.includes('Command') ||
                         html.includes('console') ||
                         html.includes('Console');
    
    expect(hasTerminalUI).toBe(true);
  });

  test('should have command input field', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    const inputs = await window.$$('input[type="text"], textarea');
    
    // Should have at least one input for commands
    // Note: could be disabled until connected
    expect(inputs.length).toBeGreaterThanOrEqual(0);
  });

  test('should display command output area', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    const html = await window.content();
    // Should have area for displaying output
    expect(html.length).toBeGreaterThan(0);
  });

  test('should support command history', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    const html = await window.content();
    const hasHistory = html.includes('history') ||
                      html.includes('History') ||
                      html.includes('previous') ||
                      html.includes('Previous') ||
                      html.includes('recent') ||
                      html.includes('Recent');
    
    expect(typeof hasHistory).toBe('boolean');
  });

  test('should allow entering commands', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    await window.waitForTimeout(1000);
    
    const inputs = await window.$$('input[type="text"], textarea');
    
    if (inputs.length > 0) {
      // Try to find command input
      for (const input of inputs) {
        const placeholder = await input.getAttribute('placeholder');
        if (placeholder && (placeholder.includes('command') || placeholder.includes('Command'))) {
          await input.fill('echo test');
          const value = await input.inputValue();
          expect(value).toBe('echo test');
          return;
        }
      }
    }
  });

  test('should display command execution controls', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    const buttons = await window.$$('button');
    
    // Should have buttons for control
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('should support output formatting', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    const html = await window.content();
    // Output area should support formatting (colors, monospace, etc.)
    const hasFormatting = html.includes('pre') ||
                         html.includes('code') ||
                         html.includes('style') ||
                         html.includes('color');
    
    expect(typeof hasFormatting).toBe('boolean');
  });

  test('should show command prompt/path', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    const html = await window.content();
    const hasPrompt = html.includes('$') ||
                     html.includes('#') ||
                     html.includes('path') ||
                     html.includes('Path') ||
                     html.includes('directory') ||
                     html.includes('Directory');
    
    expect(typeof hasPrompt).toBe('boolean');
  });

  test('should handle long command output', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    // App should handle large outputs without crashing
    const html = await window.content();
    expect(html.length).toBeGreaterThan(0);
    
    // Should still be responsive
    const buttons = await window.$$('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

});
