import { test, expect } from '@playwright/test';
import { updateRedmineResult } from '../redmine';

test('LGN-01 Admin can access login page', async ({ page }) => {
  const id = 'LGN-01';
  try {
    await page.goto('/login');
    await expect(page.locator('form')).toBeVisible();
    await updateRedmineResult(id, 'Pass');
  } catch (e: any) {
    await updateRedmineResult(id, 'Fail', e?.message);
    throw e;
  }
});

test('LGN-02 Successful login with admin', async ({ page }) => {
  const id = 'LGN-02';
  try {
    await page.goto('/login');
    await page.getByLabel('Login').fill(process.env.ADMIN_USER!);
    await page.getByLabel('Password').fill(process.env.ADMIN_PASS!);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByRole('heading', { name: 'My page' })).toBeVisible();
    await updateRedmineResult(id, 'Pass');
  } catch (e: any) {
    await updateRedmineResult(id, 'Fail', e?.message);
    throw e;
  }
});


