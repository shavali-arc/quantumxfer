import { test, expect } from '@playwright/test';

// Basic UI test for SSH Key authentication selector and dropdown
// Relies on dev server running at http://localhost:5188

test.describe('SSH Key Authentication UI', () => {
  test('shows auth selector and key dropdown', async ({ page }) => {
    await page.goto('http://localhost:5188/');

    // Authentication label
    const authLabel = page.locator('text=Authentication');
    await expect(authLabel).toBeVisible();

    // Select SSH Key option
    const sshKeyRadio = page.locator('label:has-text("SSH Key") >> input[type="radio"]');
    await expect(sshKeyRadio).toBeVisible();
    await sshKeyRadio.check();

    // Dropdown for keys should appear
    const keySelect = page.locator('select');
    await expect(keySelect).toBeVisible();
    await expect(keySelect).toHaveValue('');

    // Manage Keys button should be visible
    const manageKeysBtn = page.locator('button:has-text("Manage Keys")');
    await expect(manageKeysBtn).toBeVisible();
  });
});
