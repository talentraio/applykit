import { describe, expect, it } from 'vitest';
import {
  escapeDateLikeOrderedLines,
  markdownToHtml
} from '../../../../layers/vacancy/app/utils/cover-letter-markdown';

describe('cover-letter-markdown utils', () => {
  it('escapes date-like ordered lines to prevent markdown ordered list parsing', () => {
    const source = ['Oleksandr Huzei', '', '24. February 2026', '', 'Hello Alex,'].join('\n');
    const escaped = escapeDateLikeOrderedLines(source);

    expect(escaped).toContain('24\\. February 2026');
  });

  it('does not parse date-like line as ordered list item in html output', () => {
    const source = ['Oleksandr Huzei', '', '24. February 2026', '', 'Hello Alex,'].join('\n');
    const html = markdownToHtml(source);

    expect(html).toContain('<p>24. February 2026</p>');
    expect(html).not.toContain('<ol>');
    expect(html).not.toContain('<li>February 2026</li>');
  });

  it('keeps regular ordered list parsing for non-date content', () => {
    const source = ['1. First item', '2. Second item'].join('\n');
    const html = markdownToHtml(source);

    expect(html).toContain('<ol>');
    expect(html).toContain('<li><p>First item</p></li>');
    expect(html).toContain('<li><p>Second item</p></li>');
  });

  it('auto-links plain email addresses and urls', () => {
    const source = [
      'Contact: alex.guzey@gmail.com',
      'Portfolio: https://example.com/work.',
      'Website: www.example.org'
    ].join('\n');
    const html = markdownToHtml(source);

    expect(html).toContain('href="mailto:alex.guzey@gmail.com"');
    expect(html).toContain('href="https://example.com/work"');
    expect(html).toContain('href="https://www.example.org"');
    expect(html).toContain('https://example.com/work</a>.');
  });

  it('does not auto-link inside code spans', () => {
    const source = 'Use `alex.guzey@gmail.com` for example code only.';
    const html = markdownToHtml(source);

    expect(html).toContain('<code>alex.guzey@gmail.com</code>');
    expect(html).not.toContain('mailto:alex.guzey@gmail.com');
  });
});
