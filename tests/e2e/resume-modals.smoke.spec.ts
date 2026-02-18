import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const createUniqueSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const registerTestUser = async (page: Page): Promise<string> => {
  const suffix = createUniqueSuffix();
  const email = `playwright-resume-modals-${suffix}@example.com`;
  const password = 'Playwright1';

  await page.goto('/');

  const registerResponse = await page.request.post('/api/auth/register', {
    data: {
      email,
      password,
      firstName: 'Playwright',
      lastName: 'ResumeModals'
    }
  });

  const responseText = await registerResponse.text();
  expect(
    registerResponse.ok(),
    `register failed: ${registerResponse.status()} ${responseText}`
  ).toBe(true);

  return email;
};

const createResume = async (page: Page, email: string): Promise<void> => {
  const createResponse = await page.request.post('/api/resume', {
    data: {
      title: 'Playwright Resume',
      content: {
        personalInfo: {
          fullName: 'Playwright Resume',
          email
        },
        experience: [],
        education: [],
        skills: [{ type: 'Skills', skills: ['Testing'] }]
      }
    }
  });

  const responseText = await createResponse.text();
  expect(
    createResponse.ok(),
    `create resume failed: ${createResponse.status()} ${responseText}`
  ).toBe(true);
};

const acceptLegalConsentIfVisible = async (page: Page): Promise<void> => {
  const acceptButton = page.getByRole('button', { name: 'Accept & Continue' });
  for (let attempt = 1; attempt <= 15; attempt++) {
    if (await acceptButton.isVisible().catch(() => false)) {
      const consentCheckbox = page.getByRole('checkbox').first();
      await consentCheckbox.check();
      await acceptButton.click();
      await expect(acceptButton).toBeHidden({ timeout: 10000 });
      return;
    }

    await page.waitForTimeout(200);
  }
};

const openUploadModal = async (page: Page) => {
  const openButton = page.getByRole('button', { name: 'Clear and create new' });
  await expect(openButton).toBeVisible({ timeout: 15000 });
  await acceptLegalConsentIfVisible(page);
  await openButton.click();
  await acceptLegalConsentIfVisible(page);

  const modal = page.getByRole('dialog').filter({ hasText: 'Upload New Resume' }).first();
  if (!(await modal.isVisible().catch(() => false))) {
    await openButton.click();
  }

  await expect(modal).toBeVisible({ timeout: 10000 });

  return modal;
};

test.describe('Resume modals smoke', () => {
  test('opens upload modal from editor and closes on Escape', async ({ page }) => {
    const email = await registerTestUser(page);
    await createResume(page, email);

    await page.goto('/resume');
    await page.waitForURL('**/resume', { timeout: 20000 });
    await acceptLegalConsentIfVisible(page);

    const uploadModal = await openUploadModal(page);

    await page.keyboard.press('Escape');
    await expect(uploadModal).toBeHidden();
  });

  test('opens create-from-scratch modal from upload modal action', async ({ page }) => {
    const email = await registerTestUser(page);
    await createResume(page, email);

    await page.goto('/resume');
    await page.waitForURL('**/resume', { timeout: 20000 });
    await acceptLegalConsentIfVisible(page);

    const uploadModal = await openUploadModal(page);
    await uploadModal.getByRole('button', { name: 'Create from Scratch' }).click();

    const createModal = page.getByRole('dialog').filter({ hasText: 'Create Resume' }).first();
    await expect(createModal).toBeVisible();
    await expect(createModal).toContainText('Create Resume');
    await expect(createModal.getByRole('button', { name: 'Create Empty Resume' })).toBeVisible();
  });
});
