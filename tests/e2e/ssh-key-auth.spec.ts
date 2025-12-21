import { test, expect } from '@playwright/test';
import { launchApp, closeApp } from './helpers';

// Basic UI test for SSH Key authentication selector and dropdown
// Tests the SSH Key auth selector in the main connection UI

test.describe('SSH Key Authentication UI', () => {
  
  test.beforeEach(async () => {
    console.log('[Before Each] Cleaning up before test...');
    await closeApp();
  });

  test.afterEach(async () => {
    console.log('[After Each] Closing application...');
    await closeApp();
  });

  test('shows auth selector and key dropdown', async () => {
    const { app, window } = await launchApp();
    expect(app).toBeTruthy();
    expect(window).toBeTruthy();

    // Authentication label
    const authLabel = window.locator('text=Authentication');
    await expect(authLabel).toBeVisible({ timeout: 5000 });

    // Select SSH Key option
    const sshKeyRadio = window.locator('label:has-text("SSH Key") >> input[type="radio"]');
    await expect(sshKeyRadio).toBeVisible();
    await sshKeyRadio.check();

    // Dropdown for keys should appear
    const keySelect = window.locator('select');
    await expect(keySelect).toBeVisible();
    await expect(keySelect).toHaveValue('');

    // Manage Keys button should be visible
    const manageKeysBtn = window.locator('button:has-text("Manage Keys")');
    await expect(manageKeysBtn).toBeVisible();
  });
});
