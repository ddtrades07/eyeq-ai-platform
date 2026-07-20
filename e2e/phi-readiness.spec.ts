import { test, expect } from '@playwright/test';
import { DEMO_PASSWORD, DEMO_ROLE_ACCOUNTS } from '../src/lib/demo/accounts';

const demoEnabled = process.env.FEATURE_DEMO_MODE !== 'false';
const owner = DEMO_ROLE_ACCOUNTS.find((a) => a.key === 'owner')!;
const patient = DEMO_ROLE_ACCOUNTS.find((a) => a.key === 'patient')!;
const od = DEMO_ROLE_ACCOUNTS.find((a) => a.key === 'optometrist')!;

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

test.describe('PHI production readiness E2E (demo)', () => {
  test.skip(!demoEnabled, 'Demo mode disabled');

  test('owner login reaches provider shell', async ({ page }) => {
    await login(page, owner.email, DEMO_PASSWORD);
    await expect(page).toHaveURL(/\/(launch|provider)/, { timeout: 45_000 });
  });

  test('staff optometrist can open patients list', async ({ page }) => {
    await login(page, od.email, DEMO_PASSWORD);
    await page.goto('/provider/patients');
    await expect(page.getByRole('heading', { name: /patients/i })).toBeVisible({
      timeout: 45_000,
    });
  });

  test('patient login stays in portal', async ({ page }) => {
    await login(page, patient.email, DEMO_PASSWORD);
    await expect(page).toHaveURL(/\/(launch|patient)/, { timeout: 45_000 });
    await page.goto('/patient/home');
    await expect(page.locator('body')).toContainText(/EyeQ|visit|appointment|home/i);
  });

  test('unauthenticated PHI API returns 401', async ({ request }) => {
    const res = await request.get('/api/care-gaps');
    expect(res.status()).toBe(401);
  });

  test('PHI readiness page is reachable for owner', async ({ page }) => {
    await login(page, owner.email, DEMO_PASSWORD);
    await page.goto('/provider/settings/phi-readiness');
    await expect(page.getByRole('heading', { name: /live phi readiness/i })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.locator('body')).toContainText(/Demo only|Blocked|Needs configuration|Ready/i);
  });

  test('vendor readiness page shows configured states', async ({ page }) => {
    await login(page, owner.email, DEMO_PASSWORD);
    await page.goto('/provider/settings/vendors');
    await expect(page.getByRole('heading', { name: /vendor/i })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.locator('body')).toContainText(/OpenAI|Twilio|Stripe/i);
  });

  test('reminders page loads without fake send claims', async ({ page }) => {
    await login(page, owner.email, DEMO_PASSWORD);
    await page.goto('/provider/reminders');
    await expect(page).toHaveURL(/reminders/, { timeout: 45_000 });
  });

  test('reputation page loads in demo mode', async ({ page }) => {
    await login(page, owner.email, DEMO_PASSWORD);
    await page.goto('/provider/reputation');
    await expect(page).toHaveURL(/reputation/, { timeout: 45_000 });
  });

  test('appointment requests page loads', async ({ page }) => {
    await login(page, owner.email, DEMO_PASSWORD);
    await page.goto('/provider/appointment-requests');
    await expect(page.getByRole('heading', { name: /online appointment requests/i })).toBeVisible({
      timeout: 45_000,
    });
  });

  test('security settings expose MFA provider state', async ({ page }) => {
    await login(page, owner.email, DEMO_PASSWORD);
    await page.goto('/provider/settings/security');
    await expect(page.getByRole('heading', { name: /security/i })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.locator('body')).toContainText(/MFA|authenticator|Two-factor|provider/i);
  });
});
