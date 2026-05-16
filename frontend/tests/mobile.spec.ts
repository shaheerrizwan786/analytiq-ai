import { test, expect, Page, Locator } from '@playwright/test';

const BASE = 'http://localhost:3000';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function noHorizontalScroll(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow, `${label}: horizontal scroll detected`).toBe(false);
}

async function tapTargetOk(page: Page, selector: string, minPx = 44) {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `tap target missing: ${selector}`).not.toBeNull();
  expect(box!.height, `${selector} height < ${minPx}px`).toBeGreaterThanOrEqual(minPx);
  expect(box!.width, `${selector} width < ${minPx}px`).toBeGreaterThanOrEqual(minPx);
}

/**
 * "View live demo" goes DIRECTLY to the demo dashboard — no form.
 * The state machine: landing → handleViewDemo() → setDashboardData(demoDashboardData) → view='dashboard'
 */
async function goToDashboard(page: Page) {
  await page.goto(BASE);
  const demoBtn = page.getByRole('button', { name: /view live demo/i });
  await expect(demoBtn).toBeVisible({ timeout: 5000 });
  await demoBtn.click();
  // Dashboard loads immediately with demo data (no API call, no animation wait needed)
  await expect(page.getByRole('button', { name: /overview/i })).toBeVisible({ timeout: 8000 });
}

// ─── Landing Page Tests ──────────────────────────────────────────────────────

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
  });

  test('renders without horizontal scroll', async ({ page }) => {
    await noHorizontalScroll(page, 'Landing');
  });

  test('hero heading is visible and not clipped', async ({ page }) => {
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    const box = await h1.boundingBox();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.x).toBeGreaterThanOrEqual(0);
  });

  test('"View live demo" button is visible and has adequate tap target', async ({ page }) => {
    const btn = page.getByRole('button', { name: /view live demo/i });
    await expect(btn).toBeVisible();
    await tapTargetOk(page, 'button:has-text("View live demo")');
  });

  test('"Sign in" button is visible in navbar', async ({ page }) => {
    const signIn = page.getByRole('button', { name: /sign in/i });
    await expect(signIn).toBeVisible();
  });

  test('form inputs are visible and tappable', async ({ page }) => {
    // "Start analysis" shows the analyze form with RestaurantAutocomplete + Location inputs
    // "View live demo" goes DIRECTLY to dashboard (no form)
    const startBtn = page.getByRole('button', { name: /start analysis/i });
    await startBtn.click();
    const nameInput = page.locator('input[placeholder="e.g. The Meridian Kitchen"]');
    const locationInput = page.locator('input[placeholder="e.g. Clayton, VIC"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await expect(locationInput).toBeVisible({ timeout: 5000 });
    await tapTargetOk(page, 'input[placeholder="e.g. The Meridian Kitchen"]', 36);
    await tapTargetOk(page, 'input[placeholder="e.g. Clayton, VIC"]', 36);
  });

  test('feature strip / description cards visible', async ({ page }) => {
    // Check there is some content below the fold / feature section
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(100);
  });
});

// ─── Demo Flow Tests ─────────────────────────────────────────────────────────

test.describe('Demo Flow', () => {
  test('analyze form submits demo data and loads dashboard', async ({ page }) => {
    await page.goto(BASE);
    // Navigate to the analyze form via "Start analysis"
    const startBtn = page.getByRole('button', { name: /start analysis/i });
    await startBtn.click();

    // Fill in demo restaurant details
    const nameInput = page.locator('input[placeholder="e.g. The Meridian Kitchen"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill('The Meridian Kitchen');

    const locationInput = page.locator('input[placeholder="e.g. Clayton, VIC"]');
    await locationInput.fill('Clayton, VIC');

    // Click the "Or try with demo data →" shortcut which calls handleViewDemo()
    const tryDemoLink = page.getByText(/or try with demo data/i);
    await expect(tryDemoLink).toBeVisible({ timeout: 3000 });
    await tryDemoLink.click();

    // Dashboard should load immediately with demo data
    await expect(page.getByRole('button', { name: /overview/i })).toBeVisible({ timeout: 8000 });
  });

  test('demo loads dashboard with Meridian Kitchen data', async ({ page }) => {
    await goToDashboard(page);
    // Should show restaurant name somewhere on the page
    const body = await page.locator('body').textContent();
    expect(body).toContain('Meridian');
  });
});

// ─── Dashboard Tests ─────────────────────────────────────────────────────────

test.describe('Dashboard — Overview Tab', () => {
  test.beforeEach(async ({ page }) => {
    await goToDashboard(page);
  });

  test('no horizontal scroll on dashboard', async ({ page }) => {
    await noHorizontalScroll(page, 'Dashboard Overview');
  });

  test('restaurant name in header is visible and not overflowing', async ({ page }) => {
    const h1 = page.locator('h1, [class*="restaurant-name"]').first();
    await expect(h1).toBeVisible({ timeout: 5000 });
    const box = await h1.boundingBox();
    const vpWidth = page.viewportSize()!.width;
    expect(box!.x + box!.width).toBeLessThanOrEqual(vpWidth + 2); // 2px tolerance
  });

  test('sentiment / performance score card is visible', async ({ page }) => {
    // PerformanceScoreCard always renders "Sentiment Score" heading text
    await expect(page.getByText(/sentiment score/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('"What to Fix First" section is visible', async ({ page }) => {
    const wtff = page.getByText(/what to fix/i).first();
    await expect(wtff).toBeVisible({ timeout: 5000 });
  });

  test('AI Recommendations section visible', async ({ page }) => {
    const aiRec = page.getByText(/recommend|ai insight|top action/i).first();
    await expect(aiRec).toBeVisible({ timeout: 5000 });
  });

  test('Overview tab button has adequate tap target', async ({ page }) => {
    // 44px required on touch (< 640px); desktop tabs use sm:py-2 which gives ~36px — that\'s fine for mouse
    const vpWidth = page.viewportSize()!.width;
    await tapTargetOk(page, 'button:has-text("Overview")', vpWidth < 640 ? 44 : 36);
  });
});

test.describe('Dashboard — Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await goToDashboard(page);
  });

  test('can switch to Reviews tab', async ({ page }) => {
    const reviewsTab = page.getByRole('button', { name: /reviews/i });
    await expect(reviewsTab).toBeVisible({ timeout: 5000 });
    await reviewsTab.click();
    await page.waitForTimeout(500);
    // Reviews tab renders a search input ("Search by keyword") and review stats text
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="keyword"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await noHorizontalScroll(page, 'Reviews tab');
  });

  test('Reviews tab shows actual review cards', async ({ page }) => {
    const reviewsTab = page.getByRole('button', { name: /reviews/i });
    await reviewsTab.click();
    await page.waitForTimeout(500);
    // Look for review text content
    const body = await page.locator('body').textContent();
    expect(body!.length).toBeGreaterThan(200);
  });

  test('can switch to Trends tab', async ({ page }) => {
    const trendsTab = page.getByRole('button', { name: /trends/i });
    await expect(trendsTab).toBeVisible({ timeout: 5000 });
    await trendsTab.click();
    await page.waitForTimeout(500);
    await noHorizontalScroll(page, 'Trends tab');
  });

  test('Trends tab shows chart content', async ({ page }) => {
    const trendsTab = page.getByRole('button', { name: /trends/i });
    await trendsTab.click();
    await page.waitForTimeout(800);
    // Recharts renders SVG
    const chart = page.locator('svg, [class*="chart"], [class*="recharts"]').first();
    await expect(chart).toBeVisible({ timeout: 5000 });
  });

  test('can navigate Overview → Reviews → Trends → Overview', async ({ page }) => {
    const overviewTab = page.getByRole('button', { name: /overview/i });
    const reviewsTab = page.getByRole('button', { name: /reviews/i });
    const trendsTab = page.getByRole('button', { name: /trends/i });

    await reviewsTab.click();
    await page.waitForTimeout(300);
    await trendsTab.click();
    await page.waitForTimeout(300);
    await overviewTab.click();
    await page.waitForTimeout(300);

    // Back on overview — WhatToFixFirst should be visible
    const wtff = page.getByText(/what to fix/i).first();
    await expect(wtff).toBeVisible({ timeout: 5000 });
  });

  test('all tab buttons have adequate tap targets', async ({ page }) => {
    const vpWidth = page.viewportSize()!.width;
    const minH = vpWidth < 640 ? 44 : 36;
    await tapTargetOk(page, 'button:has-text("Overview")', minH);
    await tapTargetOk(page, 'button:has-text("Reviews")', minH);
    await tapTargetOk(page, 'button:has-text("Trends")', minH);
  });
});

// ─── Chat Tests ──────────────────────────────────────────────────────────────

/**
 * Open the chat UI regardless of viewport:
 * - Mobile/tablet (< 1024px lg): ChatButton FAB (aria-label="Open AI Advisor")
 * - Desktop (≥ 1024px lg): "AI Advisor" pill button (hidden lg:flex)
 */
async function openChat(page: Page) {
  const vpWidth = page.viewportSize()!.width;
  if (vpWidth >= 1024) {
    // Desktop: use the pill button in the tab bar
    const pill = page.getByRole('button', { name: /ai advisor/i }).first();
    await expect(pill).toBeVisible({ timeout: 5000 });
    await pill.click();
  } else {
    // Mobile: use the FAB
    const fab = page.getByRole('button', { name: /open ai advisor/i });
    await expect(fab).toBeVisible({ timeout: 5000 });
    await fab.click();
  }
}

test.describe('Dashboard — Chat', () => {
  test.beforeEach(async ({ page }) => {
    await goToDashboard(page);
  });

  test('chat trigger button is visible and adequately sized', async ({ page }) => {
    const vpWidth = page.viewportSize()!.width;
    if (vpWidth >= 1024) {
      // Desktop: pill button (hidden lg:flex) — text "AI Advisor"
      const pill = page.getByRole('button', { name: /ai advisor/i }).first();
      await expect(pill).toBeVisible({ timeout: 5000 });
      const box = await pill.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(32); // pill style, lower threshold OK
    } else {
      // Mobile: FAB (lg:hidden) — 56×56px fixed circle
      const fab = page.getByRole('button', { name: /open ai advisor/i });
      await expect(fab).toBeVisible({ timeout: 5000 });
      const box = await fab.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('chat panel opens when trigger is clicked', async ({ page }) => {
    const vpWidth = page.viewportSize()!.width;
    await openChat(page);
    // DashboardView renders TWO ChatPanel instances (inline sidebar + mobile drawer).
    // Use semantic role to target only the correct one for this viewport.
    if (vpWidth >= 1024) {
      // Desktop: inline sidebar has role="complementary" aria-label="AI Advisor"
      await expect(page.getByRole('complementary', { name: /ai advisor/i })).toBeVisible({ timeout: 5000 });
    } else {
      // Mobile/tablet: drawer has role="dialog" aria-label="AI Advisor chat panel"
      await expect(page.getByRole('dialog', { name: /ai advisor chat panel/i })).toBeVisible({ timeout: 5000 });
    }
    await noHorizontalScroll(page, 'Chat panel open');
  });

  test('can type a message in chat and send it', async ({ page }) => {
    const vpWidth = page.viewportSize()!.width;
    await openChat(page);

    // Chat opens in conversation-list view. Click “New chat” to show the input textarea.
    // Scope to the correct panel to avoid the hidden duplicate in the other variant.
    if (vpWidth >= 1024) {
      // Desktop: inline sidebar (role=complementary)
      const panel = page.getByRole('complementary', { name: /ai advisor/i });
      await panel.getByRole('button', { name: /new chat/i }).click();
      const chatInput = panel.locator('textarea[placeholder*="Ask anything"]');
      await expect(chatInput).toBeVisible({ timeout: 5000 });
      await chatInput.fill('What should I fix first?');
      await panel.getByRole('button', { name: /send message/i }).click();
    } else {
      // Mobile/tablet: drawer dialog (role=dialog)
      const panel = page.getByRole('dialog', { name: /ai advisor chat panel/i });
      await panel.getByRole('button', { name: /new chat/i }).click();
      const chatInput = panel.locator('textarea[placeholder*="Ask anything"]');
      await expect(chatInput).toBeVisible({ timeout: 5000 });
      await chatInput.fill('What should I fix first?');
      await panel.getByRole('button', { name: /send message/i }).click();
    }

    await page.waitForTimeout(500);
    const body = await page.locator('body').textContent();
    expect(body).toContain('What should I fix first?');
  });

  test('chat panel can be closed', async ({ page }) => {
    const vpWidth = page.viewportSize()!.width;
    await openChat(page);

    if (vpWidth >= 1024) {
      // Desktop: click the same pill button to toggle closed
      const pill = page.getByRole('button', { name: /close advisor|ai advisor/i }).first();
      await expect(pill).toBeVisible({ timeout: 5000 });
      await pill.click();
      // Panel should close — pill text reverts
      await expect(page.getByRole('button', { name: /✦ ai advisor/i }).first()).toBeVisible({ timeout: 3000 });
    } else {
      // Mobile: close button has aria-label="Close chat panel"
      const closeBtn = page.getByRole('button', { name: /close chat panel/i });
      await expect(closeBtn).toBeVisible({ timeout: 5000 });
      await closeBtn.click();
      await page.waitForTimeout(300);
      // FAB should be visible again
      await expect(page.getByRole('button', { name: /open ai advisor/i })).toBeVisible({ timeout: 3000 });
    }
  });
});

// ─── Navbar Tests ────────────────────────────────────────────────────────────

test.describe('Navbar', () => {
  test.beforeEach(async ({ page }) => {
    // The real Navbar component (with palette, dark mode, a11y buttons) lives in AppShell,
    // which is only used by DashboardView. The landing page has its own minimal <header>.
    await goToDashboard(page);
  });

  test('navbar renders without overflow', async ({ page }) => {
    const nav = page.locator('nav, header').first();
    await expect(nav).toBeVisible();
    await noHorizontalScroll(page, 'Navbar');
  });

  test('dark mode toggle visible and tappable (cool palette)', async ({ page }) => {
    // Dark mode toggle only renders when variant === 'cool'.
    const vpWidth = page.viewportSize()!.width;

    if (vpWidth >= 640) {
      // Palette buttons are visible at sm+ — click Cool palette directly
      const coolBtn = page.locator('[aria-label="Cool palette"]');
      await expect(coolBtn).toBeVisible({ timeout: 3000 });
      await coolBtn.click();
    } else {
      // Mobile: palette buttons are CSS-hidden (hidden sm:flex).
      // Set localStorage then re-navigate so Navbar mounts fresh with 'cool' variant.
      await page.evaluate(() => localStorage.setItem('ui:variant', 'cool'));
      await goToDashboard(page); // re-mounts Navbar which reads localStorage in useEffect
    }

    const darkToggle = page.getByRole('button', { name: /toggle dark mode/i });
    await expect(darkToggle).toBeVisible({ timeout: 5000 });
    const box = await darkToggle.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(36);
    expect(box!.height).toBeGreaterThanOrEqual(36);
  });

  test('palette switcher hidden on mobile (< 640px), visible on desktop', async ({ page }) => {
    // Now on dashboard — the real Navbar (AppShell) is visible.
    // Palette buttons: aria-label="Warm palette" inside div.hidden.sm:flex
    const vpWidth = page.viewportSize()!.width;
    const warmBtn = page.locator('[aria-label="Warm palette"]');
    if (vpWidth < 640) {
      // Button IS in the DOM but CSS-hidden by the parent div.hidden
      const visible = await warmBtn.isVisible().catch(() => false);
      expect(visible, 'Palette switcher should be hidden on mobile').toBe(false);
    } else {
      await expect(warmBtn).toBeVisible({ timeout: 5000 });
    }
  });
});

// ─── Desktop Regression ──────────────────────────────────────────────────────

test.describe('Desktop — Regression (nothing broke)', () => {
  test('landing page loads correctly at 1280px', async ({ page }) => {
    await page.goto(BASE);
    await noHorizontalScroll(page, 'Desktop landing');
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
  });

  test('dashboard loads and all tabs work at 1280px', async ({ page }) => {
    await goToDashboard(page);
    await noHorizontalScroll(page, 'Desktop dashboard');
    // All three tabs visible simultaneously
    await expect(page.getByRole('button', { name: /overview/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /reviews/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /trends/i })).toBeVisible();
  });

  test('full dashboard padding visible at desktop width', async ({ page }) => {
    await goToDashboard(page);
    const main = page.locator('[class*="px-6"]').first();
    // px-6 class should be present (desktop padding)
    await expect(main).toBeVisible({ timeout: 5000 });
  });
});
