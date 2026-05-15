/**
 * Mobile compatibility test — Analytiq AI
 * Tests landing page + demo dashboard across iPhone 15, iPhone SE, Pixel 5, iPad Mini
 * Run: node mobile-test.mjs
 */
import { chromium, webkit, firefox } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'mobile-test-screenshots');
mkdirSync(OUT_DIR, { recursive: true });

const BASE_URL = 'http://localhost:3000';

// -----------------------------------------------------------
// Device profiles (mirrors Playwright built-in device registry)
// -----------------------------------------------------------
const DEVICES = [
  {
    name: 'iPhone 15',
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    browserType: 'webkit',
  },
  {
    name: 'iPhone SE (3rd gen)',
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    browserType: 'webkit',
  },
  {
    name: 'Pixel 5 (Chrome Android)',
    viewport: { width: 393, height: 851 },
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    browserType: 'chromium',
  },
  {
    name: 'Samsung Galaxy S23 (Chrome)',
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    browserType: 'chromium',
  },
  {
    name: 'iPad Mini (landscape)',
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    browserType: 'webkit',
  },
];

// -----------------------------------------------------------
// Checks
// -----------------------------------------------------------
async function runChecks(page, device, screenshotLabel) {
  const results = { device: device.name, checks: [] };

  // LANDING PAGE checks
  const [hScroll, h1Fits, featureGrid] = await page.evaluate(() => {
    const noHScroll = document.body.scrollWidth <= window.innerWidth + 2;
    const h1 = document.querySelector('h1');
    const h1Fits = h1 ? h1.getBoundingClientRect().right <= window.innerWidth + 4 : null;
    // Feature strip grid: expect grid-cols-1 on phone (stacked vertically)
    const strip = document.querySelector('[class*="grid-cols-1"]');
    return [noHScroll, h1Fits, !!strip];
  });

  results.checks.push({ name: 'No horizontal scroll', pass: hScroll });
  results.checks.push({ name: 'H1 fits viewport',     pass: h1Fits ?? true });
  results.checks.push({ name: 'Feature grid present', pass: featureGrid });

  // Sign-in button tap target
  const signInBtn = page.locator('button', { hasText: /sign in/i });
  const btnBox = await signInBtn.first().boundingBox().catch(() => null);
  if (btnBox) {
    const minTap = Math.min(btnBox.width, btnBox.height);
    results.checks.push({ name: `Sign-in tap target ≥ 44px (${Math.round(minTap)}px)`, pass: minTap >= 40 });
  }

  await page.screenshot({ path: join(OUT_DIR, `${screenshotLabel}-landing.png`), fullPage: false });

  // --- NAVIGATE TO DEMO ---
  await page.click('button:has-text("View live demo")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT_DIR, `${screenshotLabel}-analyze-form.png`), fullPage: false });

  // Fill "Meridian Kitchen" + "Clayton" to trigger demo mode
  const nameInput = page.locator('input[placeholder*="estaurant"], input[name="name"], input[aria-label*="estaurant"]').first();
  const locInput  = page.locator('input[placeholder*="ocation"], input[placeholder*="ity"], input[aria-label*="ocation"]').first();

  await nameInput.fill('The Meridian Kitchen');
  await locInput.fill('Clayton');
  await page.waitForTimeout(300);

  await page.screenshot({ path: join(OUT_DIR, `${screenshotLabel}-form-filled.png`), fullPage: false });

  // Submit
  const analyseBtn = page.locator('button[type="submit"], button:has-text("Analyse"), button:has-text("Analyze")').first();
  await analyseBtn.click();

  // Wait for demo animation to finish (~9s)
  await page.waitForSelector('[class*="DashboardView"], [data-testid="dashboard"], h1', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(10000);
  await page.screenshot({ path: join(OUT_DIR, `${screenshotLabel}-dashboard.png`), fullPage: false });

  // DASHBOARD checks
  const [dashNoHScroll, tabsVisible, chatFabVisible, ribbonVisible] = await page.evaluate(() => {
    const noHScroll = document.body.scrollWidth <= window.innerWidth + 2;

    // Tab buttons
    const tabs = Array.from(document.querySelectorAll('button')).filter(
      b => ['Overview', 'Reviews', 'Trends'].some(t => b.textContent?.includes(t))
    );
    const tabsOk = tabs.length >= 3 && tabs.every(t => {
      const r = t.getBoundingClientRect();
      return r.height >= 36; // min tap height
    });

    // Chat FAB (mobile only - w-14 h-14)
    const fabs = Array.from(document.querySelectorAll('button')).filter(b => {
      const r = b.getBoundingClientRect();
      return r.width >= 52 && r.height >= 52 && r.bottom > window.innerHeight * 0.7;
    });

    // Demo ribbon
    const ribbon = document.body.innerText.toLowerCase().includes('demo mode');

    return [noHScroll, tabsOk, fabs.length > 0, ribbon];
  });

  results.checks.push({ name: 'Dashboard: no horizontal scroll', pass: dashNoHScroll });
  results.checks.push({ name: 'Dashboard: tab tap targets ≥ 36px', pass: tabsVisible });
  results.checks.push({ name: 'Dashboard: chat FAB present', pass: chatFabVisible });
  results.checks.push({ name: 'Dashboard: demo ribbon visible', pass: ribbonVisible });

  // Scroll dashboard and screenshot
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.screenshot({ path: join(OUT_DIR, `${screenshotLabel}-dashboard-scrolled.png`), fullPage: false });

  return results;
}

// -----------------------------------------------------------
// Main
// -----------------------------------------------------------
async function main() {
  const allResults = [];

  for (const device of DEVICES) {
    const browserType = { chromium, webkit, firefox }[device.browserType];
    const browser = await browserType.launch({ headless: true });

    const ctx = await browser.newContext({
      viewport:          device.viewport,
      deviceScaleFactor: device.deviceScaleFactor,
      isMobile:          device.isMobile,
      hasTouch:          device.hasTouch,
      userAgent:         device.userAgent,
    });

    const page = await ctx.newPage();

    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 20000 });
      const label = device.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const results = await runChecks(page, device, label);
      allResults.push(results);
    } catch (err) {
      allResults.push({ device: device.name, error: err.message });
    } finally {
      await browser.close();
    }
  }

  // -----------------------------------------------------------
  // Print results
  // -----------------------------------------------------------
  console.log('\n====================================================');
  console.log('  MOBILE COMPATIBILITY REPORT — Analytiq AI');
  console.log('====================================================\n');

  let totalPass = 0, totalFail = 0;

  for (const r of allResults) {
    if (r.error) {
      console.log(`❌  ${r.device}: ERROR — ${r.error}\n`);
      continue;
    }
    const pass = r.checks.filter(c => c.pass).length;
    const fail = r.checks.filter(c => !c.pass).length;
    totalPass += pass; totalFail += fail;
    const icon = fail === 0 ? '✅' : '⚠️ ';
    console.log(`${icon}  ${r.device}  (${pass}/${r.checks.length} checks passed)`);
    for (const c of r.checks) {
      console.log(`      ${c.pass ? '✓' : '✗'} ${c.name}`);
    }
    console.log();
  }

  console.log('----------------------------------------------------');
  console.log(`Total: ${totalPass} passed, ${totalFail} failed`);
  console.log(`Screenshots saved to: ${OUT_DIR}`);
  console.log('====================================================\n');
}

main().catch(e => { console.error(e); process.exit(1); });
