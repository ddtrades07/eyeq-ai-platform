/**
 * Capture EyeQ demo screenshots for the Remotion video.
 *
 * Usage:
 *   1. Start the app: npm run dev (from repo root)
 *   2. Optionally set DEMO_EMAIL / DEMO_PASSWORD for an authenticated demo session
 *   3. From remotion/: npm run capture
 *
 * If login is unavailable, the script writes polished placeholder PNGs so renders still work.
 * Screenshots are stored in remotion/assets/screenshots/ (demo UI only, no live PHI).
 */

import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright';

const OUT_DIR = path.resolve(__dirname, '../assets/screenshots');
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.EYEQ_BASE_URL ?? 'http://127.0.0.1:3000';

const SHOTS: { file: string; path: string; auth?: boolean }[] = [
  { file: 'dashboard.png', path: '/provider/dashboard', auth: true },
  { file: 'patient-chart.png', path: '/provider/patients', auth: true },
  { file: 'soap-note.png', path: '/provider/patients', auth: true },
  { file: 'imaging-review.png', path: '/provider/imaging', auth: true },
  { file: 'patient-portal.png', path: '/patient/home', auth: true },
  { file: 'google-reviews.png', path: '/provider/reputation', auth: true },
  { file: 'phi-readiness.png', path: '/provider/settings/phi-readiness', auth: true },
];

async function ensureDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

/** Minimal valid 1920x1080 PNG placeholder (solid soft blue) via raw PPM-less approach: write SVG as file note + skip.
 *  Playwright can screenshot a data URL page instead.
 */
async function writePlaceholder(page: Page, file: string, label: string) {
  const html = `<!DOCTYPE html><html><body style="margin:0;width:1920px;height:1080px;font-family:system-ui;
    background:linear-gradient(145deg,#E8F1F8,#F4F8FB 48%,#E6ECF5);display:flex;align-items:center;justify-content:center;">
    <div style="width:1600px;height:860px;border-radius:24px;background:rgba(255,255,255,0.88);
      border:1px solid rgba(120,160,200,0.35);box-shadow:0 18px 48px -18px rgba(40,70,110,0.28);
      display:flex;flex-direction:column;padding:40px;box-sizing:border-box;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#1FA8B8,#1B6FBF);"></div>
        <strong style="font-size:22px;color:#162033;">EyeQ</strong>
        <span style="margin-left:auto;background:#1FA8B8;color:#fff;font-size:12px;font-weight:700;
          padding:4px 10px;border-radius:999px;">DEMO PLACEHOLDER</span>
      </div>
      <h1 style="margin:0;color:#162033;font-size:36px;">${label}</h1>
      <p style="color:#3A4660;font-size:18px;max-width:720px;line-height:1.4;">
        Screenshot placeholder. Run capture against a local demo session to replace with real demo UI.
        Demo data only. No live PHI.
      </p>
    </div>
  </body></html>`;
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: path.join(OUT_DIR, file), type: 'png' });
}

async function tryLogin(page: Page): Promise<boolean> {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  if (!email || !password) return false;

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"], input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/provider|patient|dashboard/, { timeout: 20_000 });
    return true;
  } catch {
    return false;
  }
}

async function captureLive(page: Page, route: string, file: string): Promise<boolean> {
  try {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 45_000 });
    await page.waitForTimeout(800);
    // Prefer main content if present
    const target = page.locator('main').first();
    if (await target.count()) {
      await target.screenshot({ path: path.join(OUT_DIR, file), type: 'png' });
    } else {
      await page.screenshot({ path: path.join(OUT_DIR, file), type: 'png', fullPage: false });
    }
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await ensureDir();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  let loggedIn = false;
  try {
    const res = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10_000 });
    if (res && res.ok()) {
      loggedIn = await tryLogin(page);
    } else {
      console.warn(`[capture] App not reachable at ${BASE_URL}. Writing placeholders.`);
    }
  } catch {
    console.warn(`[capture] App not reachable at ${BASE_URL}. Writing placeholders.`);
  }

  for (const shot of SHOTS) {
    let ok = false;
    if (loggedIn) {
      ok = await captureLive(page, shot.path, shot.file);
    }
    if (!ok) {
      const placeholderDir = path.join(OUT_DIR, '_placeholders');
      fs.mkdirSync(placeholderDir, { recursive: true });
      const placeholderPage = await context.newPage();
      await writePlaceholder(
        placeholderPage,
        path.join('_placeholders', shot.file),
        shot.file.replace('.png', '').replace(/-/g, ' '),
      );
      // writePlaceholder joins OUT_DIR — pass relative path under OUT_DIR
      await placeholderPage.close();
      console.log(`[capture] placeholder → _placeholders/${shot.file} (mocks used in video until live capture)`);
    } else {
      console.log(`[capture] live demo → ${shot.file}`);
    }
  }

  await browser.close();
  console.log(`[capture] done → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
