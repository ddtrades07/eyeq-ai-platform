import { test, expect } from '@playwright/test';
import { DEMO_OWNER_EMAIL, DEMO_OWNER_PASSWORD } from '../src/lib/demo/constants';

const demoEnabled = process.env.FEATURE_DEMO_MODE !== 'false';

test.describe('Demo authentication', () => {
  test.skip(!demoEnabled, 'Demo mode disabled');

  test('demo owner can reach provider dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(DEMO_OWNER_EMAIL);
    await page.getByLabel(/password/i).fill(DEMO_OWNER_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/(launch|provider\/dashboard)/, { timeout: 30_000 });
  });

  test('demo owner can open messages inbox', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(DEMO_OWNER_EMAIL);
    await page.getByLabel(/password/i).fill(DEMO_OWNER_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.goto('/provider/messages');
    await expect(page.getByRole('heading', { name: /messages/i })).toBeVisible({ timeout: 30_000 });
  });
});
