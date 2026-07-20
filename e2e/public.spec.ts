import { test, expect } from '@playwright/test';

test.describe('Public pages', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('health endpoint returns status', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('checks');
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    // CardTitle renders as a div, not a heading role.
    await expect(page.getByText(/reset password/i).first()).toBeVisible();
  });
});
