import { test, expect } from '@playwright/test';

test('share debug image should render and match snapshot', async ({ page }) => {
  await page.goto('/share-debug');

  // attendre que l'image soit générée
  await page.waitForSelector('img[alt="share-preview"]', { timeout: 10000 });
  const img = page.locator('img[alt="share-preview"]');
  await expect(img).toBeVisible();

  // vérifier que le status indique succès
  await page.waitForSelector('text=Image générée', { timeout: 10000 });

  // capturer l'image générée (élément) — Playwright enregistrera la snapshot au premier run
  await expect(img).toHaveScreenshot('share-debug.png', { maxDiffPixelRatio: 0.01 });
});