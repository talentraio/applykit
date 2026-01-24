# Test Fixtures

Test data and sample files for e2e and integration tests.

## Files

### `sample-resume.docx`

A sample resume file for testing the parse flow. Should contain:

- Personal information (name, email, phone)
- Professional summary
- Work experience (2-3 positions)
- Education (1-2 entries)
- Skills section
- Languages section

Create this file manually or use a template from `docs/examples/` (to be added).

### `invalid-file.txt`

A text file to test invalid file format handling.

Content:

```
This is not a valid resume file.
It should trigger a validation error.
```

### `sample-vacancy.json`

Sample vacancy data for API tests:

```json
{
  "company": "Tech Corp",
  "jobPosition": "Senior Software Engineer",
  "description": "We are looking for a Senior Software Engineer...",
  "url": "https://example.com/jobs/senior-engineer"
}
```

## Usage

### In Playwright Tests

```typescript
import { test } from '@playwright/test'

test('should parse resume', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles('./tests/fixtures/sample-resume.docx')
})
```

### In API Tests

```typescript
import sampleVacancy from '../fixtures/sample-vacancy.json'

describe('Vacancy API', () => {
  it('should create vacancy', async () => {
    const response = await $fetch('/api/vacancies', {
      method: 'POST',
      body: sampleVacancy
    })
    expect(response.company).toBe('Tech Corp')
  })
})
```

## Creating Sample Resume

You can use this template structure for `sample-resume.docx`:

```
John Doe
john.doe@example.com | +1-555-0123
New York, NY | Remote

PROFESSIONAL SUMMARY
Senior Software Engineer with 7+ years of experience in full-stack development.
Expertise in TypeScript, React, Node.js, and PostgreSQL.

EXPERIENCE

Senior Software Engineer | Tech Solutions Inc
Jan 2020 - Present
- Developed and maintained 10+ microservices using Node.js and TypeScript
- Improved API performance by 40% through query optimization
- Led team of 5 developers in migrating legacy codebase to modern stack

Software Engineer | Digital Agency Co
Jun 2017 - Dec 2019
- Built responsive web applications using React and Vue.js
- Implemented CI/CD pipelines reducing deployment time by 60%
- Collaborated with designers to create pixel-perfect UIs

EDUCATION

Bachelor of Science in Computer Science
State University | 2013 - 2017
GPA: 3.8/4.0

SKILLS

Languages: TypeScript, JavaScript, Python, SQL
Frontend: React, Vue.js, Next.js, Nuxt
Backend: Node.js, Express, PostgreSQL, Redis
DevOps: Docker, Kubernetes, GitHub Actions, AWS

LANGUAGES

English - Native
Spanish - Professional Working Proficiency
```

## Adding New Fixtures

1. Create the file in this directory
2. Document it in this README
3. Reference it in test files using relative path
4. Commit to git (unless it contains sensitive data)

## CI/CD

In CI environments, ensure fixtures are available:

```yaml
# .github/workflows/e2e.yml
- name: Setup test fixtures
  run: |
    cp tests/fixtures/sample-vacancy.json tests/fixtures/active-vacancy.json
    # Add any fixture preprocessing here
```
