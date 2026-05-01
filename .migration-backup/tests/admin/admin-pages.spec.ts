import { test, expect } from '@playwright/test';

test.describe('Admin static pages (render checks)', () => {
  test('Admin Author page redirects / hides when not admin (render guard)', async ({ page }) => {
    await page.goto('/admin/author');
    // when unauthenticated the app redirects to / (guard in useAdmin)
    await expect(page).toHaveURL(/(^\/|\/auth)/);
  });

  test('Admin Design page redirects / hides when not admin (render guard)', async ({ page }) => {
    await page.goto('/admin/design');
    // when unauthenticated the app redirects to / (guard in useAdmin)
    await expect(page).toHaveURL(/(^\/|\/auth)/);
  });
});
