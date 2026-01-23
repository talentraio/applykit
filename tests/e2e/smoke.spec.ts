import { expect, test } from '@playwright/test'

test.describe('Smoke test', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/')

    // Basic check that the page loaded
    await expect(page).toHaveTitle(/.*/)
  })

  test('should render without critical errors', async ({ page }) => {
    const errors: string[] = []

    page.on('pageerror', error => {
      errors.push(error.message)
    })

    await page.goto('/')

    // Wait a bit for any async errors
    await page.waitForTimeout(1000)

    // Check that no critical errors occurred
    expect(errors).toHaveLength(0)
  })
})
