const LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const BOLD_PATTERN = /\*\*([^*]+)\*\*/g;
const ITALIC_PATTERN = /\*([^*]+)\*/g;
const CODE_PATTERN = /`([^`]+)`/g;
const HTML_TAG_PATTERN = /<\/?([a-z][a-z0-9:-]*)(?:\s[^<>]*)?>/gi;
const PLAIN_URL_PATTERN = /(^|[\s(])((?:https?:\/\/|www\.)[^\s<]+)/gi;
const PLAIN_EMAIL_PATTERN = /(^|[\s(])([\w.%+-]+@[\w.-]+\.[a-z]{2,})/gi;
const LINK_EXCLUDED_TAGS = new Set(['a', 'code', 'pre']);

const BLOCKQUOTE_PATTERN = /^>\s?(.+)$/;
const DATE_LIKE_ORDERED_ITEM_TEXT_PATTERN = /^\p{L}+\.?\s+\d{4}(?:\s*р\.?)?$/u;
const DATE_LIKE_LINE_PATTERN = /^\s*\d{1,2}\.\s+\p{L}+\.?\s+\d{4}(?:\s*р\.?)?\s*$/u;

function parseHeading(line: string): { level: number; text: string } | null {
  let cursor = 0;
  while (cursor < line.length && line[cursor] === '#' && cursor < 3) {
    cursor += 1;
  }

  if (cursor === 0 || cursor > 3) return null;

  const separator = line[cursor];
  if (separator !== ' ' && separator !== '\t') return null;

  const text = line.slice(cursor).trim();
  if (!text) return null;

  return {
    level: cursor,
    text
  };
}

function parseUnorderedListItem(line: string): string | null {
  const marker = line[0];
  if (marker !== '-' && marker !== '*') return null;

  const separator = line[1];
  if (separator !== ' ' && separator !== '\t') return null;

  const text = line.slice(2).trim();
  return text.length > 0 ? text : null;
}

function parseOrderedListItem(line: string): string | null {
  let cursor = 0;
  while (cursor < line.length) {
    const charCode = line.charCodeAt(cursor);
    if (charCode < 48 || charCode > 57) {
      break;
    }

    cursor += 1;
  }

  if (cursor === 0 || cursor >= line.length || line[cursor] !== '.') return null;

  const separator = line[cursor + 1];
  if (separator !== ' ' && separator !== '\t') return null;

  const text = line.slice(cursor + 2).trim();
  if (DATE_LIKE_ORDERED_ITEM_TEXT_PATTERN.test(text)) {
    return null;
  }

  return text.length > 0 ? text : null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sanitizeLink(rawUrl: string): string | null {
  const normalized = rawUrl.trim();
  if (!normalized) return null;
  const normalizedLower = normalized.toLowerCase();

  if (
    normalizedLower.startsWith('http://') ||
    normalizedLower.startsWith('https://') ||
    normalizedLower.startsWith('mailto:')
  ) {
    return normalized;
  }

  return null;
}

function splitTrailingPunctuation(value: string): { core: string; trailing: string } {
  let core = value;
  let trailing = '';

  while (core.length > 0) {
    const char = core.slice(-1);
    if (!'.!,?;:)]'.includes(char)) break;

    trailing = `${char}${trailing}`;
    core = core.slice(0, -1);
  }

  return { core, trailing };
}

function linkifyPlainText(text: string): string {
  const withLinks = text.replaceAll(
    PLAIN_URL_PATTERN,
    (_fullMatch, prefix: string, candidate: string) => {
      const { core, trailing } = splitTrailingPunctuation(candidate);
      if (!core) {
        return `${prefix}${candidate}`;
      }

      const hrefCandidate = core.toLowerCase().startsWith('www.') ? `https://${core}` : core;
      const safeUrl = sanitizeLink(hrefCandidate);
      if (!safeUrl) {
        return `${prefix}${candidate}`;
      }

      return `${prefix}<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${core}</a>${trailing}`;
    }
  );

  return withLinks.replaceAll(
    PLAIN_EMAIL_PATTERN,
    (_fullMatch, prefix: string, candidate: string) => {
      const { core, trailing } = splitTrailingPunctuation(candidate);
      if (!core) {
        return `${prefix}${candidate}`;
      }

      const safeMailto = sanitizeLink(`mailto:${core}`);
      if (!safeMailto) {
        return `${prefix}${candidate}`;
      }

      return `${prefix}<a href="${safeMailto}" target="_blank" rel="noopener noreferrer">${core}</a>${trailing}`;
    }
  );
}

function applyAutoLinks(rendered: string): string {
  if (!rendered.includes('<')) {
    return linkifyPlainText(rendered);
  }

  let cursor = 0;
  let result = '';
  let skipDepth = 0;

  for (const tagMatch of rendered.matchAll(HTML_TAG_PATTERN)) {
    const fullTag = tagMatch[0];
    const tagName = (tagMatch[1] ?? '').toLowerCase();
    const tokenStart = tagMatch.index ?? 0;
    const tokenEnd = tokenStart + fullTag.length;
    const isClosingTag = fullTag.startsWith('</');
    const isSelfClosingTag = fullTag.endsWith('/>');
    const segment = rendered.slice(cursor, tokenStart);

    result += skipDepth > 0 ? segment : linkifyPlainText(segment);
    result += fullTag;

    if (LINK_EXCLUDED_TAGS.has(tagName) && !isSelfClosingTag) {
      if (isClosingTag) {
        skipDepth = Math.max(0, skipDepth - 1);
      } else {
        skipDepth += 1;
      }
    }

    cursor = tokenEnd;
  }

  const tail = rendered.slice(cursor);
  result += skipDepth > 0 ? tail : linkifyPlainText(tail);

  return result;
}

function renderInlineMarkdown(text: string): string {
  let rendered = escapeHtml(text);

  rendered = rendered.replaceAll(CODE_PATTERN, '<code>$1</code>');
  rendered = rendered.replaceAll(BOLD_PATTERN, '<strong>$1</strong>');
  rendered = rendered.replaceAll(ITALIC_PATTERN, '<em>$1</em>');

  rendered = rendered.replaceAll(LINK_PATTERN, (_fullMatch, label: string, url: string) => {
    const safeUrl = sanitizeLink(url);
    if (!safeUrl) {
      return label;
    }

    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  return applyAutoLinks(rendered);
}

function normalizeParagraphLine(line: string): string {
  // Tiptap markdown hard break marker: "line\\"
  return line.replace(/(?<!\\)\\$/u, '');
}

function flushParagraph(paragraphLines: string[], htmlParts: string[]): void {
  if (paragraphLines.length === 0) return;

  const paragraph = paragraphLines
    .map(line => normalizeParagraphLine(line))
    .map(line => renderInlineMarkdown(line))
    .join('<br />');
  htmlParts.push(`<p>${paragraph}</p>`);
  paragraphLines.length = 0;
}

function closeLists(state: { ulOpen: boolean; olOpen: boolean }, htmlParts: string[]): void {
  if (state.ulOpen) {
    htmlParts.push('</ul>');
    state.ulOpen = false;
  }

  if (state.olOpen) {
    htmlParts.push('</ol>');
    state.olOpen = false;
  }
}

export function markdownToHtml(markdown: string): string {
  if (!markdown.trim()) return '';

  const lines = markdown.replaceAll(/\r\n?/g, '\n').split('\n');
  const htmlParts: string[] = [];
  const paragraphLines: string[] = [];
  const listState = {
    ulOpen: false,
    olOpen: false
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph(paragraphLines, htmlParts);
      closeLists(listState, htmlParts);
      continue;
    }

    const heading = parseHeading(trimmed);
    if (heading) {
      flushParagraph(paragraphLines, htmlParts);
      closeLists(listState, htmlParts);
      const headingText = renderInlineMarkdown(heading.text);
      htmlParts.push(`<h${heading.level}>${headingText}</h${heading.level}>`);
      continue;
    }

    const unorderedItem = parseUnorderedListItem(trimmed);
    if (unorderedItem) {
      flushParagraph(paragraphLines, htmlParts);
      if (!listState.ulOpen) {
        closeLists(listState, htmlParts);
        htmlParts.push('<ul>');
        listState.ulOpen = true;
      }

      htmlParts.push(`<li><p>${renderInlineMarkdown(unorderedItem)}</p></li>`);
      continue;
    }

    const orderedItem = parseOrderedListItem(trimmed);
    if (orderedItem) {
      flushParagraph(paragraphLines, htmlParts);
      if (!listState.olOpen) {
        closeLists(listState, htmlParts);
        htmlParts.push('<ol>');
        listState.olOpen = true;
      }

      htmlParts.push(`<li><p>${renderInlineMarkdown(orderedItem)}</p></li>`);
      continue;
    }

    const blockquoteMatch = trimmed.match(BLOCKQUOTE_PATTERN);
    if (blockquoteMatch) {
      flushParagraph(paragraphLines, htmlParts);
      closeLists(listState, htmlParts);
      htmlParts.push(`<blockquote>${renderInlineMarkdown(blockquoteMatch[1] ?? '')}</blockquote>`);
      continue;
    }

    closeLists(listState, htmlParts);
    paragraphLines.push(trimmed);
  }

  flushParagraph(paragraphLines, htmlParts);
  closeLists(listState, htmlParts);

  return htmlParts.join('');
}

export function markdownToPlainText(markdown: string): string {
  return markdown
    .replaceAll(/\\\n/g, '\n')
    .replaceAll(/\r\n?/g, '\n')
    .replaceAll(/```[\s\S]*?```/g, '')
    .replaceAll(/^#{1,6}\s+/gm, '')
    .replaceAll(/^>\s?/gm, '')
    .replaceAll(/^[-*]\s+/gm, '')
    .replaceAll(/^\d+\.\s+/gm, '')
    .replaceAll(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1 ($2)')
    .replaceAll(/\*\*([^*]+)\*\*/g, '$1')
    .replaceAll(/\*([^*]+)\*/g, '$1')
    .replaceAll(/`([^`]+)`/g, '$1')
    .replaceAll(/\n{3,}/g, '\n\n')
    .trim();
}

export function escapeDateLikeOrderedLines(markdown: string): string {
  if (!markdown.trim()) return markdown;

  const lines = markdown.replaceAll(/\r\n?/g, '\n').split('\n');
  const normalizedLines = lines.map(line =>
    DATE_LIKE_LINE_PATTERN.test(line) ? line.replace(/^(\s*\d{1,2})\./u, '$1\\.') : line
  );

  return normalizedLines.join('\n');
}
