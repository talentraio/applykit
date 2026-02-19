import type { Page, Request } from '@playwright/test';
import { expect, test } from '@playwright/test';

const waitForFormatSettingsRequest = (page: Page, method: 'PATCH' | 'PUT') =>
  page.waitForRequest(
    request => request.url().includes('/api/user/format-settings') && request.method() === method,
    { timeout: 10000 }
  );

const parseRequestBody = (request: Request): Record<string, unknown> => {
  const payload = request.postData();
  if (!payload) return {};

  return JSON.parse(payload) as Record<string, unknown>;
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

const registerAndOpenResumeEditor = async (page: Page) => {
  const uid = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const email = `playwright-resume-${uid}@example.com`;
  const password = 'Playwright1';

  await page.goto('/');

  const registerResult = await page.evaluate(
    async ({ email: registerEmail, password: registerPassword }) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
          firstName: 'Playwright',
          lastName: 'Tester'
        })
      });

      return {
        ok: response.ok,
        status: response.status,
        body: await response.text()
      };
    },
    { email, password }
  );

  expect(
    registerResult.ok,
    `register failed: ${registerResult.status} ${registerResult.body}`
  ).toBe(true);

  const createResumeResult = await page.evaluate(async resumeEmail => {
    const response = await fetch('/api/resume', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        title: 'My Resume',
        content: {
          personalInfo: {
            fullName: 'Playwright Tester',
            email: resumeEmail
          },
          experience: [],
          education: [],
          skills: [{ type: 'Skills', skills: ['Testing'] }]
        }
      })
    });

    return {
      ok: response.ok,
      status: response.status,
      body: await response.text()
    };
  }, email);

  expect(
    createResumeResult.ok,
    `create resume failed: ${createResumeResult.status} ${createResumeResult.body}`
  ).toBe(true);

  await page.goto('/resume');
  await page.waitForURL('**/resume', { timeout: 20000 });
  await page.waitForTimeout(700);
  await acceptLegalConsentIfVisible(page);

  await expect(page.getByRole('tab', { name: 'Settings' })).toBeVisible({ timeout: 20000 });
};

test.describe('Resume settings autosave and history', () => {
  test('should keep PATCH/PUT semantics for autosave, undo/redo and cancel', async ({ page }) => {
    await registerAndOpenResumeEditor(page);

    const toolsPanel = page.locator('.resume-editor-tools');
    const tabsList = toolsPanel.getByRole('tablist').first();
    const settingsTab = tabsList.getByRole('tab', { name: 'Settings' });
    const slider = page.getByRole('slider').first();
    await settingsTab.click();
    try {
      await expect(slider).toBeVisible({ timeout: 3000 });
    } catch {
      await settingsTab.focus();
      await settingsTab.press('Space');
      await expect(slider).toBeVisible({ timeout: 7000 });
    }

    await expect(slider).toBeVisible({ timeout: 10000 });

    const initialValue = await slider.getAttribute('aria-valuenow');
    expect(initialValue).not.toBeNull();

    const patchRequestPromise = waitForFormatSettingsRequest(page, 'PATCH');
    await slider.click();
    await slider.press('ArrowRight');
    const patchRequest = await patchRequestPromise;
    const patchBody = parseRequestBody(patchRequest);

    expect(patchBody).toHaveProperty('ats');
    expect(patchBody).toHaveProperty('ats.spacing');
    expect(patchBody).not.toHaveProperty('human');

    await expect(slider).not.toHaveAttribute('aria-valuenow', initialValue ?? '');
    const changedValue = await slider.getAttribute('aria-valuenow');
    expect(changedValue).not.toBeNull();

    const undoButton = page.getByRole('button', { name: 'Undo' });
    const redoButton = page.getByRole('button', { name: 'Redo' });

    await expect(undoButton).toBeEnabled();
    const undoPutRequestPromise = waitForFormatSettingsRequest(page, 'PUT');
    await undoButton.click();
    const undoPutBody = parseRequestBody(await undoPutRequestPromise);

    expect(undoPutBody).toHaveProperty('ats');
    expect(undoPutBody).toHaveProperty('human');
    await expect(slider).toHaveAttribute('aria-valuenow', initialValue ?? '');

    await expect(redoButton).toBeEnabled();
    const redoPutRequestPromise = waitForFormatSettingsRequest(page, 'PUT');
    await redoButton.click();
    const redoPutBody = parseRequestBody(await redoPutRequestPromise);

    expect(redoPutBody).toHaveProperty('ats');
    expect(redoPutBody).toHaveProperty('human');
    await expect(slider).toHaveAttribute('aria-valuenow', changedValue ?? '');

    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await expect(cancelButton).toBeVisible();

    const cancelPutRequestPromise = waitForFormatSettingsRequest(page, 'PUT');
    await cancelButton.click();
    const cancelPutBody = parseRequestBody(await cancelPutRequestPromise);

    expect(cancelPutBody).toHaveProperty('ats');
    expect(cancelPutBody).toHaveProperty('human');
    await expect(slider).toHaveAttribute('aria-valuenow', initialValue ?? '');
    await expect(undoButton).toBeDisabled();
  });
});
