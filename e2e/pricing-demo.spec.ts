import { test, expect } from '@playwright/test';

test.describe('Public pricing and demo smoke', () => {
  test('/pricing shows plans and free Live Demo', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: /plans for practices/i })).toBeVisible();
    await expect(page.getByText(/Patients never pay/i).first()).toBeVisible();
    await expect(page.getByText(/Live Demo is free/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Open Live Demo/i })).toBeVisible();
  });

  test('/demo remains reachable without payment', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.locator('body')).toContainText(/demo|EyeQ|synthetic|Live/i);
    await expect(page.locator('body')).not.toContainText(/Enter payment|Credit card required/i);
  });

  test('homepage keeps AI safety + Live Demo CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Live Demo/i }).first()).toBeVisible();
    await expect(page.getByText(/Not a diagnosis/i).first()).toBeVisible();
  });
});
