import { describe, expect, it } from 'vitest';
import { ExperienceLinkSchema, PersonalInfoSchema } from '../schemas/resume';
import { VacancyInputSchema } from '../schemas/vacancy';

describe('uRL protocol safety', () => {
  it('accepts only http/https personal profile links', () => {
    const valid = PersonalInfoSchema.safeParse({
      fullName: 'Alex Doe',
      email: 'alex@example.com',
      linkedin: 'https://linkedin.com/in/alex'
    });
    const invalid = PersonalInfoSchema.safeParse({
      fullName: 'Alex Doe',
      email: 'alex@example.com',
      linkedin: 'javascript:alert(1)'
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it('rejects scriptable protocols in experience links', () => {
    const valid = ExperienceLinkSchema.safeParse({
      name: 'Portfolio',
      link: 'https://example.com/work'
    });
    const invalid = ExperienceLinkSchema.safeParse({
      name: 'Payload',
      link: 'data:text/html,<svg onload=alert(1)>'
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it('rejects non-http protocols for vacancy url', () => {
    const valid = VacancyInputSchema.safeParse({
      company: 'Acme',
      jobPosition: 'Engineer',
      description: 'Role description',
      url: 'https://acme.example/jobs/123',
      notes: null,
      status: 'created'
    });
    const invalid = VacancyInputSchema.safeParse({
      company: 'Acme',
      jobPosition: 'Engineer',
      description: 'Role description',
      url: 'javascript:alert(1)',
      notes: null,
      status: 'created'
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });
});
