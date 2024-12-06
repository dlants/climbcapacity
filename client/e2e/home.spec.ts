import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  // Navigate to the home page
  await page.goto('/');
  
  // Wait for the page to be loaded
  await expect(page).toHaveURL('/');
  
  // Take a screenshot for visual reference
  await page.screenshot({ path: 'e2e/screenshots/home.png' });
});
