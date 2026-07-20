import { test, expect } from '@playwright/test';

const demoEnabled = process.env.FEATURE_DEMO_MODE !== 'false';

test.describe('Live Demo walkthrough smoke', () => {
  test.skip(!demoEnabled, 'Demo mode disabled');

  test('marketing Live Demo CTA points at demo intro', async ({ page }) => {
    await page.goto('/');
    const liveDemo = page.getByRole('link', { name: /live demo/i }).first();
    await expect(liveDemo).toBeVisible({ timeout: 30_000 });
    await expect(liveDemo).toHaveAttribute('href', '/demo');
  });

  test('demo intro page loads with role options', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.getByRole('heading', { name: /optometry operating system/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('button', { name: /start owner demo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /start provider demo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /start staff demo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /start patient portal demo/i })).toBeVisible();
    await expect(page.getByText(/google reviews/i).first()).toBeVisible();
    await expect(page.getByText(/synthetic demo data only/i).first()).toBeVisible();
  });

  test('login page Live Demo links to /demo', async ({ page }) => {
    await page.goto('/login');
    const cta = page.getByRole('link', { name: /^live demo$/i }).first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', '/demo');
  });
});

test.describe('Authenticated demo pages (optional credentials)', () => {
  test.skip(!demoEnabled, 'Demo mode disabled');
  test.skip(!process.env.E2E_DEMO_EMAIL || !process.env.E2E_DEMO_PASSWORD, 'Demo credentials not set');

  test('owner can open walkthrough and core pages', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.E2E_DEMO_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_DEMO_PASSWORD!);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/(provider|launch)/, { timeout: 45_000 });

    await page.goto('/provider/demo-walkthrough');
    await expect(page.getByRole('heading', { name: /guided optometry demo/i })).toBeVisible({
      timeout: 45_000,
    });

    await page.goto('/provider/dashboard');
    await expect(page.locator('body')).toContainText(/command center|dashboard|today/i);

    await page.goto('/provider/appointments');
    await expect(page.locator('body')).toContainText(/schedule|appointment/i);

    await page.goto('/provider/imaging');
    await expect(page.locator('body')).toContainText(/imaging/i);

    await page.goto('/provider/reputation');
    await expect(page.locator('body')).toContainText(/review|reputation|google/i);

    await page.goto('/provider/reputation/questions');
    await expect(page.locator('body')).toContainText(/question|reputation|google/i);

    await page.goto('/provider/eye-health-library');
    await expect(page.locator('body')).toContainText(/eye health|education|library/i);

    await page.goto('/provider/dashboard?recording=true');
    await expect(page.locator('body')).toContainText(/demo/i);
  });
});
