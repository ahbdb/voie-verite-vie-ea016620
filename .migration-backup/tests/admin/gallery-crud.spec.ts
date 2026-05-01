import path from 'path';
import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;
const FIXTURE_IMAGE = path.resolve(process.cwd(), 'src/assets/gallery-retreat.jpg');

// These tests require a real admin account. Provide credentials via env:
// TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD. If not present, the test(s) are skipped.

test.describe('Admin gallery CRUD (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) test.skip();
    await page.goto('/auth');
    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', ADMIN_PASSWORD);
    await page.click('role=button[name="Se connecter"]');
    // wait for navigation after sign in
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('upload image into an album and delete album', async ({ page }) => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) test.skip();

    await page.goto('/admin/gallery');

    // Open dialog
    await page.click('text=Ajouter');

    // Fill title and group name
    await page.fill('input[placeholder="Titre de l\'album ou de l\'image"]', 'E2E Test Image');
    await page.fill('input[placeholder="Ex: Retraite 2025, Conférence Janvier..."]', 'E2E Test Album');

    // Attach a fixture image to the hidden file input
    const fileInput = page.locator('input[type=file]');
    await fileInput.setInputFiles(FIXTURE_IMAGE);

    // Submit
    await page.click('role=button:has-text("Ajouter")');

    // Wait for success toast (message contains 'ajoutée')
    await page.waitForSelector('text=ajout', { timeout: 10000 });

    // Verify the uploaded image appears in the album (by alt/title)
    await expect(page.locator('img[alt="E2E Test Image"]')).toBeVisible({ timeout: 5000 });

    // Delete the album via its album action button (title attr)
    const deleteAlbumBtn = page.locator('button[title^="Supprimer l\'album"]');
    await expect(deleteAlbumBtn).toBeVisible();

    // Accept confirm dialog automatically
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await deleteAlbumBtn.click();

    // Wait for deletion toast
    await page.waitForSelector('text=Album supprimé', { timeout: 10000 });

    // Confirm the image/album no longer exists
    await expect(page.locator('img[alt="E2E Test Image"]')).toHaveCount(0);
  });
});
