import { test, expect } from '@playwright/test';

test.describe('API authorization', () => {
  test('patients API requires auth', async ({ request }) => {
    const res = await request.get('/api/patients');
    expect(res.status()).toBe(401);
  });

  test('appointments API requires auth', async ({ request }) => {
    const res = await request.get('/api/appointments');
    expect(res.status()).toBe(401);
  });

  test('care-gaps API requires auth', async ({ request }) => {
    const res = await request.get('/api/care-gaps');
    expect(res.status()).toBe(401);
  });

  test('imaging analyze requires auth', async ({ request }) => {
    const res = await request.post('/api/imaging/analyze', {
      data: { imagingCaseId: 'test' },
    });
    expect(res.status()).toBe(401);
  });

  test('jobs processor accepts unauthenticated when no secret configured', async ({ request }) => {
    const res = await request.post('/api/jobs/process');
    expect([200, 401]).toContain(res.status());
    if (res.ok()) {
      const body = await res.json();
      expect(body).toHaveProperty('processed');
    }
  });
});

test.describe('Access control', () => {
  test('provider dashboard redirects unauthenticated users', async ({ page }) => {
    await page.goto('/provider/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('patient portal redirects unauthenticated users', async ({ page }) => {
    await page.goto('/patient/home');
    await expect(page).toHaveURL(/\/login/);
  });

  test('access denied page loads', async ({ page }) => {
    await page.goto('/access-denied');
    await expect(page.getByText(/access denied|permission/i)).toBeVisible();
  });
});

test.describe('Messaging routes', () => {
  test('provider messages requires auth', async ({ page }) => {
    await page.goto('/provider/messages');
    await expect(page).toHaveURL(/\/login/);
  });

  test('patient messages requires auth', async ({ page }) => {
    await page.goto('/patient/messages');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Exam chart', () => {
  test('exam route requires auth', async ({ page }) => {
    await page.goto('/provider/encounters/test-id/exam');
    await expect(page).toHaveURL(/\/login/);
  });
});
