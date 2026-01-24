import { expect, test } from '@playwright/test'

/**
 * E2E Happy Path Smoke Test
 *
 * Tests the complete user journey through the application:
 * 1. Auth: User signs in with Google OAuth
 * 2. Parse: User uploads and parses a resume
 * 3. Vacancy: User creates a job vacancy
 * 4. Generate: User generates a tailored resume
 * 5. Export: User exports the resume as PDF
 *
 * This test is marked as .skip() until:
 * - Google OAuth is configured for test environment
 * - Backend services are implemented (parse, generate, export)
 * - Test user credentials are set up
 *
 * Related tasks: T059-T069 (Auth), T072-T081 (Parse), T082-T091 (Vacancy),
 *                T092-T102 (Generate), T115-T124 (Export)
 */

test.describe.skip('Happy Path - Complete User Journey', () => {
  // Test data
  const testResumePath = './tests/fixtures/sample-resume.docx'
  const testVacancy = {
    company: 'Tech Corp',
    position: 'Senior Software Engineer',
    description: `
      We are looking for a Senior Software Engineer with expertise in:
      - TypeScript and Node.js
      - React and Vue.js
      - PostgreSQL and Redis
      - CI/CD and DevOps
    `
  }

  test.beforeEach(async ({ page }) => {
    // Start at homepage
    await page.goto('/')
  })

  test('should complete full user journey: auth → parse → vacancy → generate → export', async ({
    page
  }) => {
    // ========================================
    // Step 1: Authentication
    // ========================================
    test.step('User signs in with Google', async () => {
      // Click "Sign in with Google" button
      await page.getByRole('button', { name: /sign in with google/i }).click()

      // Wait for OAuth redirect
      // Note: In real test, you'd need to handle Google OAuth flow
      // For now, assume we're redirected back after successful auth
      await page.waitForURL('**/dashboard', { timeout: 30000 })

      // Verify user is logged in
      await expect(page.getByText(/welcome/i)).toBeVisible()
    })

    // ========================================
    // Step 2: Parse Resume
    // ========================================
    test.step('User uploads and parses a resume', async () => {
      // Navigate to resume upload
      await page.getByRole('link', { name: /upload resume/i }).click()

      // Upload resume file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(testResumePath)

      // Click parse button
      await page.getByRole('button', { name: /parse resume/i }).click()

      // Wait for parsing to complete
      await expect(page.getByText(/parsing complete/i)).toBeVisible({
        timeout: 30000
      })

      // Verify parsed data is displayed
      await expect(page.getByText(/personal information/i)).toBeVisible()
      await expect(page.getByText(/experience/i)).toBeVisible()
      await expect(page.getByText(/education/i)).toBeVisible()
    })

    // ========================================
    // Step 3: Create Vacancy
    // ========================================
    test.step('User creates a job vacancy', async () => {
      // Navigate to vacancies
      await page.getByRole('link', { name: /vacancies/i }).click()

      // Click "New Vacancy" button
      await page.getByRole('button', { name: /new vacancy/i }).click()

      // Fill vacancy form
      await page.getByLabel(/company/i).fill(testVacancy.company)
      await page.getByLabel(/position/i).fill(testVacancy.position)
      await page.getByLabel(/description/i).fill(testVacancy.description)

      // Save vacancy
      await page.getByRole('button', { name: /save/i }).click()

      // Verify vacancy is created
      await expect(page.getByText(testVacancy.company)).toBeVisible()
      await expect(page.getByText(testVacancy.position)).toBeVisible()
    })

    // ========================================
    // Step 4: Generate Tailored Resume
    // ========================================
    test.step('User generates a tailored resume', async () => {
      // Click "Generate" button on the vacancy
      await page
        .getByRole('article')
        .filter({ hasText: testVacancy.company })
        .getByRole('button', { name: /generate/i })
        .click()

      // Wait for generation to complete
      await expect(page.getByText(/generating/i)).toBeVisible()
      await expect(page.getByText(/generation complete/i)).toBeVisible({
        timeout: 60000 // LLM generation can take time
      })

      // Verify match scores are displayed
      await expect(page.getByText(/match score/i)).toBeVisible()
      await expect(page.getByText(/before:/i)).toBeVisible()
      await expect(page.getByText(/after:/i)).toBeVisible()

      // Verify generated content preview is available
      await expect(page.getByRole('button', { name: /view resume/i })).toBeVisible()
    })

    // ========================================
    // Step 5: Export Resume
    // ========================================
    test.step('User exports resume as PDF', async () => {
      // Open the generated resume
      await page.getByRole('button', { name: /view resume/i }).click()

      // Export ATS version
      await page.getByRole('button', { name: /export ats/i }).click()

      // Wait for export to complete
      const atsDownloadPromise = page.waitForEvent('download')
      await atsDownloadPromise

      // Verify download started
      const atsDownload = await atsDownloadPromise
      expect(atsDownload.suggestedFilename()).toMatch(/\.pdf$/i)

      // Export Human-readable version
      await page.getByRole('button', { name: /export human/i }).click()

      // Wait for export to complete
      const humanDownloadPromise = page.waitForEvent('download')
      await humanDownloadPromise

      // Verify download started
      const humanDownload = await humanDownloadPromise
      expect(humanDownload.suggestedFilename()).toMatch(/\.pdf$/i)
    })

    // ========================================
    // Verification: Check final state
    // ========================================
    test.step('Verify final state', async () => {
      // Navigate to dashboard
      await page.getByRole('link', { name: /dashboard/i }).click()

      // Verify user has:
      // - 1 resume uploaded and parsed
      // - 1 vacancy created
      // - 1 generation created
      await expect(page.getByText(/1 resume/i)).toBeVisible()
      await expect(page.getByText(/1 vacancy/i)).toBeVisible()
      await expect(page.getByText(/1 generation/i)).toBeVisible()

      // Verify usage stats are updated
      await expect(page.getByText(/operations today/i)).toBeVisible()
    })
  })

  test('should enforce daily limits', async ({ page }) => {
    test.step('User hits daily limit', async () => {
      // Assume user is logged in and at dashboard
      await page.goto('/dashboard')

      // Try to parse resume multiple times until limit is hit
      for (let i = 0; i < 4; i++) {
        await page.getByRole('link', { name: /upload resume/i }).click()

        const fileInput = page.locator('input[type="file"]')
        await fileInput.setInputFiles(testResumePath)

        await page.getByRole('button', { name: /parse resume/i }).click()

        if (i < 3) {
          // First 3 should succeed (public role limit is 3)
          await expect(page.getByText(/parsing complete/i)).toBeVisible({
            timeout: 30000
          })
        } else {
          // 4th attempt should show limit error
          await expect(page.getByText(/daily limit exceeded/i)).toBeVisible()
          await expect(page.getByText(/limit: 3 per day/i)).toBeVisible()
        }
      }
    })
  })

  test('should handle errors gracefully', async ({ page }) => {
    test.step('User encounters parsing error', async () => {
      await page.goto('/dashboard')

      // Upload invalid file
      await page.getByRole('link', { name: /upload resume/i }).click()

      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles('./tests/fixtures/invalid-file.txt')

      await page.getByRole('button', { name: /parse resume/i }).click()

      // Verify error message is displayed
      await expect(page.getByText(/invalid file format/i)).toBeVisible()
      await expect(page.getByText(/docx or pdf required/i)).toBeVisible()
    })

    test.step('User encounters generation error', async () => {
      // Assume user has a vacancy but generation fails
      await page.goto('/vacancies')

      await page
        .getByRole('button', { name: /generate/i })
        .first()
        .click()

      // Simulate LLM error
      await expect(page.getByText(/generation failed/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
    })
  })

  test('should support sign out', async ({ page }) => {
    test.step('User signs out', async () => {
      await page.goto('/dashboard')

      // Click user menu
      await page.getByRole('button', { name: /account/i }).click()

      // Click sign out
      await page.getByRole('button', { name: /sign out/i }).click()

      // Verify redirected to login page
      await expect(page).toHaveURL(/\/login/)
      await expect(page.getByText(/sign in with google/i)).toBeVisible()
    })
  })
})

/**
 * Setup Notes for Running This Test
 *
 * 1. Environment Variables (.env.test):
 *    - NUXT_SESSION_PASSWORD=test-session-password-32-chars
 *    - NUXT_OAUTH_GOOGLE_CLIENT_ID=test-client-id
 *    - NUXT_OAUTH_GOOGLE_CLIENT_SECRET=test-client-secret
 *    - NUXT_DATABASE_URL=postgresql://test:test@localhost:5432/test_db
 *
 * 2. Test Database:
 *    - Run: pnpm db:migrate
 *    - Seed test user with 'public' role
 *
 * 3. Test Fixtures:
 *    - Create tests/fixtures/sample-resume.docx
 *    - Create tests/fixtures/invalid-file.txt
 *
 * 4. Mock OAuth (Option 1 - Playwright Auth):
 *    - Use Playwright's authentication state
 *    - Save authenticated session to tests/auth/user.json
 *    - Load in test.use({ storageState: 'tests/auth/user.json' })
 *
 * 5. Mock OAuth (Option 2 - Test Endpoint):
 *    - Create /api/auth/test-login endpoint (test env only)
 *    - Use it to bypass Google OAuth in tests
 *
 * 6. Running Tests:
 *    - pnpm e2e:headed (with browser visible)
 *    - pnpm e2e (headless)
 *    - pnpm e2e --debug (debug mode)
 *
 * 7. CI/CD:
 *    - Run in GitHub Actions with test database
 *    - Use --forbid-only to prevent .only() in CI
 *    - Use --reporter=github for better CI output
 *
 * To enable this test, remove .skip() from the describe block after:
 * - All backend services are implemented
 * - Test authentication is configured
 * - Test fixtures are created
 */
