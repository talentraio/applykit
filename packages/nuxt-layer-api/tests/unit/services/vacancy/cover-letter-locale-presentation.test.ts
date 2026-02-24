import { describe, expect, it, vi } from 'vitest';
import {
  formatCoverLetterCurrentDate,
  getCoverLetterLetterClosing
} from '../../../../server/services/vacancy/cover-letter-locale-presentation';

describe('cover-letter locale presentation config', () => {
  it.each([
    { language: 'en' as const, market: 'default' as const, expectedDate: '23 February 2026' },
    { language: 'en' as const, market: 'dk' as const, expectedDate: '23 February 2026' },
    { language: 'da-DK' as const, market: 'dk' as const, expectedDate: '23 februar 2026' },
    { language: 'uk-UA' as const, market: 'ua' as const, expectedDate: '23 лютого 2026 р.' }
  ])('formats current date for %s market profile', ({ expectedDate, language, market }) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-23T12:00:00.000Z'));

    try {
      expect(formatCoverLetterCurrentDate(language, market)).toBe(expectedDate);
    } finally {
      vi.useRealTimers();
    }
  });

  it('maps deterministic letter closings by locale and tone', () => {
    expect(getCoverLetterLetterClosing('en', 'professional')).toBe('Sincerely,');
    expect(getCoverLetterLetterClosing('da-DK', 'direct')).toBe('Hilsen');
    expect(getCoverLetterLetterClosing('uk-UA', 'enthusiastic')).toBe('З найкращими побажаннями');
  });
});
