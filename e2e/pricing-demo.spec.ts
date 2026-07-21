import { test, expect } from '@playwright/test';

test.describe('Public pricing and demo smoke', () => {
  test('/pricing shows plans and free Live Demo', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: /plans for practices/i })).toBeVisible();
    await expect(page.getByText(/For practice owners only/i).first()).toBeVisible();
    await expect(page.getByText(/Patients do not pay for EyeQ access/i).first()).toBeVisible();
    await expect(page.getByText(/Patients never pay/i).first()).toBeVisible();
    await expect(page.getByText(/Live Demo is free/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Open Live Demo/i })).toBeVisible();
  });

  test('/demo remains reachable without payment', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.locator('body')).toContainText(/demo|EyeQ|synthetic|Live/i);
    await expect(page.locator('body')).not.toContainText(/Enter payment|Credit card required/i);
  });

  test('homepage keeps AI safety + Live Demo CTA + path cards without public prices', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Live Demo/i }).first()).toBeVisible();
    await expect(page.getByText(/Not a diagnosis/i).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Choose how you use EyeQ/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Built for Modern Optometry Practices/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Patient Login$/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /^Staff Login$/i }).first()).toBeVisible();
    // No plan dollar amounts on the public homepage
    await expect(page.locator('body')).not.toContainText(/\$\d+\s*\/\s*mo/i);
  });
});
