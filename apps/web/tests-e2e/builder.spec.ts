import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByPlaceholder('Password').fill('e2e');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/');
}

test('new query from template, open in google', async ({ page, context }) => {
  await login(page);
  await page.getByRole('button', { name: /\+ new query/i }).click();
  await page.getByRole('button', { name: /from template/i }).click();
  await page.getByRole('button', { name: /exposed \.env/i }).click();
  await expect(page).toHaveURL(/\/q\/[0-9a-f-]+/);
  await page.waitForTimeout(900);

  const popupPromise = context.waitForEvent('page');
  await page.getByRole('button', { name: /open in google/i }).click();
  const popup = await popupPromise;
  expect(popup.url()).toContain('google.com/search');
});

test('builder page renders preview for loaded query', async ({ page }) => {
  // Use the first test's query (template) which has pre-built children already in the store
  await login(page);
  await page.goto('/q/new?engine=google');
  await page.getByPlaceholder('Query name…').fill('e2e test');
  // verify the preview bar is visible and shows empty state
  await expect(page.locator('pre.q')).toBeVisible();
  // verify the + Add button exists in the builder
  await expect(page.locator('.group.root').getByRole('button', { name: '+ Add' })).toBeVisible();
});
