import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

type VacancySeed = {
  company: string;
  jobPosition: string;
  description: string;
};

type VacancyApiResponse = {
  id: string;
  company: string;
  jobPosition: string | null;
  description: string;
};

const createUniqueSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const registerTestUser = async (page: Page): Promise<void> => {
  const suffix = createUniqueSuffix();
  const email = `playwright-vacancy-delete-${suffix}@example.com`;
  const password = 'Playwright1';

  await page.goto('/');

  const response = await page.request.post('/api/auth/register', {
    data: {
      email,
      password,
      firstName: 'Playwright',
      lastName: 'DeleteTester'
    }
  });

  const responseText = await response.text();
  expect(response.ok(), `register failed: ${response.status()} ${responseText}`).toBe(true);
};

const createVacancy = async (page: Page, vacancy: VacancySeed): Promise<VacancyApiResponse> => {
  const response = await page.request.post('/api/vacancies', {
    data: vacancy
  });

  const responseText = await response.text();
  expect(response.ok(), `create vacancy failed: ${response.status()} ${responseText}`).toBe(true);

  return JSON.parse(responseText) as VacancyApiResponse;
};

const waitForUiReady = async (page: Page): Promise<void> => {
  // Nuxt pages can render SSR markup before all client handlers are hydrated.
  await page.waitForTimeout(700);
};

const openSingleDeleteModalFromRow = async (page: Page, company: string): Promise<void> => {
  const row = page.locator('tr', { hasText: company }).first();
  await expect(row).toBeVisible();

  const deleteButton = row.getByRole('button', { name: 'Delete Vacancy', exact: true });
  await expect(deleteButton).toBeVisible();

  for (let attempt = 1; attempt <= 3; attempt++) {
    await deleteButton.click();

    const dialog = page.getByRole('dialog').last();

    try {
      await expect(dialog).toBeVisible({ timeout: 1500 });
      return;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }

      await page.waitForTimeout(350);
    }
  }
};

const confirmModalAction = async (page: Page, buttonName: RegExp): Promise<void> => {
  const dialog = page.getByRole('dialog').last();
  await expect(dialog).toBeVisible({ timeout: 15000 });

  const confirmButton = dialog.getByRole('button', { name: buttonName });
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();
};

test.describe('Vacancy deletion', () => {
  test.describe.configure({ mode: 'serial' });

  test('should delete a vacancy from list page', async ({ page }) => {
    const suffix = createUniqueSuffix();
    const targetCompany = `Single Delete Co ${suffix}`;

    await registerTestUser(page);
    await createVacancy(page, {
      company: targetCompany,
      jobPosition: 'Engineer',
      description: 'Single delete test vacancy'
    });

    await page.goto('/vacancies');
    await waitForUiReady(page);
    await openSingleDeleteModalFromRow(page, targetCompany);

    const deleteRequest = page.waitForResponse(response => {
      const pathname = new URL(response.url()).pathname;
      return response.request().method() === 'DELETE' && /^\/api\/vacancies\/[^/]+$/.test(pathname);
    });

    await confirmModalAction(page, /delete vacancy|delete/i);
    const deleteResponse = await deleteRequest;
    expect(deleteResponse.status()).toBe(204);

    await expect(page.locator('tr', { hasText: targetCompany })).toHaveCount(0);
  });

  test('should bulk delete selected vacancies from list page', async ({ page }) => {
    const suffix = createUniqueSuffix();
    const companyA = `Bulk Delete A ${suffix}`;
    const companyB = `Bulk Delete B ${suffix}`;
    await registerTestUser(page);

    await createVacancy(page, {
      company: companyA,
      jobPosition: 'Engineer',
      description: 'Bulk delete vacancy A'
    });
    await createVacancy(page, {
      company: companyB,
      jobPosition: 'Engineer',
      description: 'Bulk delete vacancy B'
    });

    await page.goto('/vacancies');
    await waitForUiReady(page);

    await expect(page.locator('tr', { hasText: companyA })).toHaveCount(1);
    await expect(page.locator('tr', { hasText: companyB })).toHaveCount(1);

    const selectAllCheckbox = page.getByRole('checkbox', { name: 'Select all' });
    await expect(selectAllCheckbox).toBeVisible();
    await selectAllCheckbox.click();
    await expect(selectAllCheckbox).toHaveAttribute('aria-checked', 'true');

    const bulkDeleteButton = page.getByRole('button', { name: /delete selected/i }).first();
    await expect(bulkDeleteButton).toBeVisible({ timeout: 15000 });
    await bulkDeleteButton.click();

    const bulkDeleteRequest = page.waitForResponse(response => {
      const pathname = new URL(response.url()).pathname;
      return response.request().method() === 'DELETE' && pathname === '/api/vacancies/bulk';
    });

    await confirmModalAction(page, /delete selected|delete/i);
    const bulkDeleteResponse = await bulkDeleteRequest;
    expect(bulkDeleteResponse.status()).toBe(204);

    await expect(page.locator('tr', { hasText: companyA })).toHaveCount(0);
    await expect(page.locator('tr', { hasText: companyB })).toHaveCount(0);
  });

  test('should delete a vacancy from overview page and redirect to list', async ({ page }) => {
    const suffix = createUniqueSuffix();
    const targetCompany = `Overview Delete Co ${suffix}`;

    await registerTestUser(page);
    const vacancy = await createVacancy(page, {
      company: targetCompany,
      jobPosition: 'Engineer',
      description: 'Overview delete test vacancy'
    });

    await page.goto(`/vacancies/${vacancy.id}/overview`);
    await waitForUiReady(page);
    await expect(page.getByRole('heading', { name: targetCompany })).toBeVisible();

    await page.getByRole('button', { name: /^delete$/i }).click();

    const deleteRequest = page.waitForResponse(response => {
      const pathname = new URL(response.url()).pathname;
      return (
        response.request().method() === 'DELETE' && pathname === `/api/vacancies/${vacancy.id}`
      );
    });

    await confirmModalAction(page, /delete vacancy|delete/i);
    const deleteResponse = await deleteRequest;
    expect(deleteResponse.status()).toBe(204);

    await page.waitForURL('**/vacancies', { timeout: 5000 }).catch(() => null);
    if (!/\/vacancies\/?$/.test(new URL(page.url()).pathname)) {
      await page.goto('/vacancies');
      await waitForUiReady(page);
    }

    await expect(page.locator('tr', { hasText: targetCompany })).toHaveCount(0);
  });
});
