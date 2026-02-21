const LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const BOLD_PATTERN = /\*\*([^*]+)\*\*/g;
const ITALIC_PATTERN = /\*([^*]+)\*/g;
const CODE_PATTERN = /`([^`]+)`/g;

const BLOCKQUOTE_PATTERN = /^>\s?(.+)$/;

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
  if (!rawUrl) return null;

  if (
    rawUrl.startsWith('http://') ||
    rawUrl.startsWith('https://') ||
    rawUrl.startsWith('mailto:')
  ) {
    return rawUrl;
  }

  return null;
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

  return rendered;
}

function flushParagraph(paragraphLines: string[], htmlParts: string[]): void {
  if (paragraphLines.length === 0) return;

  const paragraph = paragraphLines.map(line => renderInlineMarkdown(line)).join('<br />');
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

      htmlParts.push(`<li>${renderInlineMarkdown(unorderedItem)}</li>`);
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

      htmlParts.push(`<li>${renderInlineMarkdown(orderedItem)}</li>`);
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
