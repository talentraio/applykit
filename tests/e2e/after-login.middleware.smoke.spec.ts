import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const createUniqueSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const registerTestUser = async (page: Page): Promise<void> => {
  const suffix = createUniqueSuffix();
  const email = `playwright-after-login-${suffix}@example.com`;
  const password = 'Playwright1';

  await page.goto('/');

  const response = await page.request.post('/api/auth/register', {
    data: {
      email,
      password,
      firstName: 'Playwright',
      lastName: 'AfterLogin'
    }
  });

  const responseText = await response.text();
  expect(response.ok(), `register failed: ${response.status()} ${responseText}`).toBe(true);
};

const createVacancy = async (page: Page, company: string): Promise<void> => {
  const response = await page.request.post('/api/vacancies', {
    data: {
      company,
      jobPosition: 'Engineer',
      description: 'After login middleware smoke vacancy'
    }
  });

  const responseText = await response.text();
  expect(response.ok(), `create vacancy failed: ${response.status()} ${responseText}`).toBe(true);
};

test.describe('After-login middleware smoke', () => {
  test('redirects to /resume when user has no vacancies', async ({ page }) => {
    await registerTestUser(page);

    await page.goto('/auth/post-login');
    await page.waitForURL('**/resume', { timeout: 15000 });

    expect(new URL(page.url()).pathname).toBe('/resume');
  });

  test('redirects to /vacancies when user has vacancies', async ({ page }) => {
    await registerTestUser(page);
    await createVacancy(page, `After Login Co ${createUniqueSuffix()}`);

    await page.goto('/auth/post-login');
    await page.waitForURL('**/vacancies', { timeout: 15000 });

    expect(new URL(page.url()).pathname).toBe('/vacancies');
  });
});
