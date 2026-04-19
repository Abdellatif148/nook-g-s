import { test, expect } from '@playwright/test';

test('app loads and renders welcome or login page', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Wait for the main app to load
  // The WelcomePage has "Pour les propriétaires de cafés" based on the user prompt
  // or a general "Nook OS" title.
  await page.waitForLoadState('networkidle');

  // Take a screenshot of the loaded state
  await page.screenshot({ path: 'loaded-state.png' });

  // Check if Nook OS is visible (either in loader or app)
  await expect(page.locator('text=Nook OS').first()).toBeVisible();
});
