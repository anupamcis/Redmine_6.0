import { test, expect } from '@playwright/test';
import { updateRedmineResult } from '../redmine';

async function loginAdmin(page) {
  await page.goto('/login');
  await page.getByLabel('Login').fill(process.env.ADMIN_USER!);
  await page.getByLabel('Password').fill(process.env.ADMIN_PASS!);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: 'My page' })).toBeVisible();
}

test('PRJ-01 Create project (minimal)', async ({ page }) => {
  const id = 'PRJ-01';
  try {
    await loginAdmin(page);
    await page.goto('/projects');
    await page.getByRole('link', { name: 'New project' }).click();
    const name = `QA-${Date.now()}`;
    await page.getByLabel('Name *').fill(name);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await updateRedmineResult(id, 'Pass');
  } catch (e: any) {
    await updateRedmineResult(id, 'Fail', e?.message);
    throw e;
  }
});


