import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const waitForUiReady = async (page: Page) => {
  // Nuxt pages can render SSR markup before all client handlers are hydrated.
  await page.waitForTimeout(700);
};

const openModalFromLanding = async (page: Page) => {
  const signInButton = page.getByRole('button', { name: 'Sign in' });
  await expect(signInButton).toBeVisible();

  for (let attempt = 1; attempt <= 3; attempt++) {
    await signInButton.click();

    try {
      await expect(page).toHaveURL(/[?&]auth=login/, { timeout: 1500 });
      return;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }

      await page.waitForTimeout(350);
    }
  }
};

test.describe('Auth modals smoke', () => {
  test('should open from landing CTA, switch views, and close with URL sync', async ({ page }) => {
    await page.goto('/');
    await waitForUiReady(page);
    await openModalFromLanding(page);

    const modal = page.getByRole('dialog').last();
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Sign In to ApplyKit');
    await expect(modal).toContainText('Forgot password?');

    await modal.getByRole('button', { name: 'Register' }).click();
    await expect(page).toHaveURL(/[?&]auth=register/);
    await expect(modal).toContainText('Create Your Account');
    await expect(modal).toContainText('First Name');

    await modal.getByRole('button', { name: 'Sign In' }).last().click();
    await expect(page).toHaveURL(/[?&]auth=login/);
    await expect(modal).toContainText('Sign In to ApplyKit');

    await modal.getByRole('button', { name: 'Forgot password?' }).click();
    await expect(page).toHaveURL(/[?&]auth=forgot/);
    await expect(modal).toContainText('Reset Password');
    await expect(modal).toContainText('Send Reset Link');

    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(url => !url.searchParams.has('auth'));
    await expect(modal).toBeHidden();
  });

  test('should open by direct auth query deep-link', async ({ page }) => {
    await page.goto('/?auth=register');
    await waitForUiReady(page);

    const modal = page.getByRole('dialog').last();
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Create Your Account');
    await expect(modal).toContainText('First Name');
  });

  test('should not emit hydration mismatch warnings when opening by auth query', async ({
    page
  }) => {
    const warnings: string[] = [];

    page.on('console', message => {
      if (message.type() === 'warning' || message.type() === 'error') {
        warnings.push(message.text());
      }
    });

    await page.goto('/?auth=login');
    await waitForUiReady(page);

    const modal = page.getByRole('dialog').last();
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Sign In to ApplyKit');

    const hydrationWarnings = warnings.filter(
      message =>
        message.includes('Hydration node mismatch') ||
        message.includes('Hydration completed but contains mismatches')
    );

    expect(hydrationWarnings).toHaveLength(0);
  });
});
