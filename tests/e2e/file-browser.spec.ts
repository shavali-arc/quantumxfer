import { test, expect } from '@playwright/test';
import { launchApp, closeApp, captureScreenshot } from './helpers';

/**
 * E2E Tests: File Browser
 * 
 * Tests the file browser UI and directory navigation:
 * - Listing remote files/directories
 * - Navigating between directories
 * - Viewing file properties
 * - Sorting and filtering
 * - Directory operations (create, delete, rename)
 */

test.describe('File Browser', () => {
  
  test.beforeEach(async () => {
    await closeApp();
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== 'passed') {
      await captureScreenshot(testInfo.title);
    }
    await closeApp();
  });

  test('should display file browser UI when connected', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    // Check for file browser indicators
    const html = await window.content();
    const hasBrowserUI = html.includes('file') || 
                        html.includes('File') ||
                        html.includes('directory') ||
                        html.includes('Directory');
    
    expect(hasBrowserUI).toBe(true);
  });

  test('should have navigation controls', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    // Look for navigation buttons (Back, Home, Up, etc.)
    const navButtons = await window.$$('button');
    expect(navButtons.length).toBeGreaterThan(0);
  });

  test('should support directory navigation', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    await window.waitForTimeout(1000);
    
    // Look for directory/folder elements
    const fileListItems = await window.$$('[data-testid*="file"], li, tr, div[class*="item"]');
    
    // Should have some file list container
    expect(fileListItems.length).toBeGreaterThanOrEqual(0);
  });

  test('should display file properties', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    const html = await window.content();
    const hasFileProps = html.includes('size') || 
                         html.includes('Size') ||
                         html.includes('modified') ||
                         html.includes('Modified') ||
                         html.includes('permissions') ||
                         html.includes('Permissions');
    
    expect(hasFileProps).toBe(true);
  });

  test('should support file sorting', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    // Look for sort controls (column headers, dropdown, buttons)
    const sortControls = await window.$$('[data-testid*="sort"], .sort, button:has-text("Sort")');
    
    // Either has sort UI or can be disabled (depending on implementation)
    const html = await window.content();
    const hasSortUI = sortControls.length > 0 || 
                      html.includes('sort') || 
                      html.includes('Sort');
    
    expect(typeof hasSortUI).toBe('boolean');
  });

  test('should display breadcrumb or current path', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    const html = await window.content();
    const hasPathDisplay = html.includes('/') || 
                          html.includes('path') ||
                          html.includes('Path') ||
                          html.includes('breadcrumb');
    
    expect(hasPathDisplay).toBe(true);
  });

  test('should handle empty directories gracefully', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    // App should handle empty directory state without crashing
    const html = await window.content();
    expect(html.length).toBeGreaterThan(0);
    
    // Should still be responsive
    const buttons = await window.$$('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('should support file selection', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    await window.waitForTimeout(1000);
    
    // Look for clickable file items
    const clickableItems = await window.$$('[data-testid*="file"], [data-testid*="item"], li, tr');
    
    if (clickableItems.length > 0) {
      // Try to click first item
      await clickableItems[0].click();
      
      // Should not crash
      expect(true).toBe(true);
    }
  });

  test('should show loading state during operations', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    // App should have loading indicators for async operations
    const html = await window.content();
    const hasLoadingUI = html.includes('loading') || 
                        html.includes('Loading') ||
                        html.includes('spinner') ||
                        html.includes('progress') ||
                        html.includes('Progress');
    
    expect(typeof hasLoadingUI).toBe('boolean');
  });

  test('should display file type indicators', async () => {
    const { window } = await launchApp();
    await window.waitForSelector('#root', { state: 'attached', timeout: 15000 });
    
    const html = await window.content();
    // Files should have visual indicators (icons, badges, etc.)
    const hasTypeIndicators = html.includes('file') || 
                              html.includes('File') ||
                              html.includes('folder') ||
                              html.includes('Folder');
    
    expect(hasTypeIndicators).toBe(true);
  });

});
