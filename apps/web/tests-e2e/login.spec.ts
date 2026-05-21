import { expect, test } from '@playwright/test';

test('login happy path', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Password').fill('e2e');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL('/');
});

test('login wrong password shows error', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Password').fill('wrong');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.locator('.err')).toContainText(/invalid|password/i);
});
