<template>
  <div class="vacancy-item-cover-right-preview">
    <BasePaginatedSheets
      class="vacancy-item-cover-right-preview__pages"
      :blocks="contentBlocks"
      :margin-x-mm="settings.marginX"
      :margin-y-mm="settings.marginY"
      :font-size="settings.fontSize"
      :line-height="settings.lineHeight"
      :block-spacing-px="paragraphSpacingPx"
      :show-page-numbers="showPageNumbers"
      :show-loading-when-measuring="true"
      :elevated="elevated"
    >
      <template #content="{ blocks: pageBlocks }">
        <div class="vacancy-item-cover-right-preview__page-content" :style="contentVariables">
          <template v-for="block in pageBlocks" :key="block.id">
            <div class="vacancy-item-cover-right-preview__block" :data-block-id="block.id">
              <p
                v-if="isSubjectBlock(block)"
                class="vacancy-item-cover-right-preview__subject"
                :title="block.subject"
              >
                <strong>Subject:</strong> {{ block.subject }}
              </p>

              <article
                v-else
                class="vacancy-item-cover-right-preview__block-html"
                v-html="block.html"
              />
            </div>
          </template>
        </div>
      </template>
    </BasePaginatedSheets>
  </div>
</template>

<script setup lang="ts">
import type { SpacingSettings } from '@int/schema';

type CoverPreviewHtmlBlock = {
  id: string;
  kind: 'html';
  html: string;
  keepWithNext?: number;
};

type CoverPreviewSubjectBlock = {
  id: string;
  kind: 'subject';
  subject: string;
  keepWithNext?: number;
};

type CoverPreviewBlock = CoverPreviewHtmlBlock | CoverPreviewSubjectBlock;

defineOptions({ name: 'VacancyItemCoverRightPreview' });

const props = withDefaults(
  defineProps<{
    htmlContent: string;
    settings: SpacingSettings;
    subjectLine?: string | null;
    elevated?: boolean;
    showPageNumbers?: boolean;
  }>(),
  {
    subjectLine: null,
    elevated: true,
    showPageNumbers: true
  }
);

const paragraphSpacing = computed(() => 0.6 + ((props.settings.blockSpacing - 1) / 8) * 1.2);
const paragraphSpacingPx = computed(
  () => paragraphSpacing.value * props.settings.fontSize * (96 / 72)
);

const contentVariables = computed(() => ({
  '--vacancy-item-cover-right-preview-block-gap': `${paragraphSpacing.value}em`
}));

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]);

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const parseTopLevelHtmlSegments = (value: string): string[] => {
  const normalized = value.trim();
  if (!normalized) return [];

  const segments: string[] = [];
  const tagPattern = /<\/?([a-z][a-z0-9:-]*)(?:\s[^<>]*)?>/gi;
  let depth = 0;
  let segmentStart = -1;
  let cursor = 0;

  for (const match of normalized.matchAll(tagPattern)) {
    const fullTag = match[0];
    const tagName = match[1]?.toLowerCase() ?? '';
    const tokenStart = match.index ?? 0;
    const tokenEnd = tokenStart + fullTag.length;
    const isClosingTag = fullTag.startsWith('</');
    const isSelfClosingTag = fullTag.endsWith('/>') || VOID_TAGS.has(tagName);

    if (depth === 0 && tokenStart > cursor) {
      const textPart = normalized.slice(cursor, tokenStart).trim();
      if (textPart) {
        segments.push(`<p>${escapeHtml(textPart)}</p>`);
      }
    }

    if (!isClosingTag) {
      if (depth === 0) {
        segmentStart = tokenStart;
      }

      if (!isSelfClosingTag) {
        depth += 1;
      } else if (depth === 0 && segmentStart >= 0) {
        const segment = normalized.slice(segmentStart, tokenEnd).trim();
        if (segment) {
          segments.push(segment);
        }
        segmentStart = -1;
      }
    } else {
      if (depth > 0) {
        depth -= 1;
      }

      if (depth === 0 && segmentStart >= 0) {
        const segment = normalized.slice(segmentStart, tokenEnd).trim();
        if (segment) {
          segments.push(segment);
        }
        segmentStart = -1;
      }
    }

    cursor = tokenEnd;
  }

  if (depth === 0 && cursor < normalized.length) {
    const tailText = normalized.slice(cursor).trim();
    if (tailText) {
      segments.push(`<p>${escapeHtml(tailText)}</p>`);
    }
  }

  return segments;
};

const parseHtmlBlocks = (value: string): CoverPreviewHtmlBlock[] => {
  const normalized = value.trim();
  if (!normalized) return [];

  const segments = parseTopLevelHtmlSegments(normalized);
  if (segments.length === 0) {
    return [{ id: 'html-0', kind: 'html', html: normalized }];
  }

  return segments.map((segment, index) => ({
    id: `html-${index}`,
    kind: 'html',
    html: segment,
    keepWithNext: /^<h[1-3]\b/i.test(segment) ? 1 : 0
  }));
};

const contentBlocks = computed<CoverPreviewBlock[]>(() => {
  const htmlBlocks = parseHtmlBlocks(props.htmlContent);
  const subject = props.subjectLine?.trim();

  if (!subject) {
    return htmlBlocks;
  }

  return [
    {
      id: 'subject',
      kind: 'subject',
      subject,
      keepWithNext: htmlBlocks.length > 0 ? 1 : 0
    },
    ...htmlBlocks
  ];
});

const isSubjectBlock = (block: CoverPreviewBlock): block is CoverPreviewSubjectBlock => {
  return block.kind === 'subject';
};
</script>

<style lang="scss">
.vacancy-item-cover-right-preview {
  width: 100%;
  position: relative;

  &__page-content {
    color: #1f2937;
    font-family: Manrope, 'Segoe UI', sans-serif;
  }

  &__block {
    display: flow-root;

    &:not(:first-child) {
      margin-top: var(--vacancy-item-cover-right-preview-block-gap);
    }
  }

  &__subject {
    margin: 0;
  }

  &__block-html {
    p,
    ul,
    ol,
    h1,
    h2,
    h3,
    blockquote {
      margin: 0;
    }

    ul,
    ol {
      padding-left: 1.25em;
      list-style-position: outside;
    }

    ul {
      list-style-type: disc;
    }

    ol {
      list-style-type: decimal;
    }

    li {
      display: list-item;
      margin-bottom: 0.3em;
    }

    h1,
    h2,
    h3 {
      font-weight: 600;
      line-height: 1.2;
    }

    h1 {
      font-size: 1.3em;
    }

    h2 {
      font-size: 1.2em;
    }

    h3 {
      font-size: 1.1em;
    }

    blockquote {
      padding-left: 0.9em;
      border-left: 2px solid #d1d5db;
      color: #4b5563;
    }

    code {
      background: #f3f4f6;
      border-radius: 0.2rem;
      padding: 0.05em 0.25em;
      font-size: 0.92em;
    }

    a {
      color: #2563eb;
      text-decoration: underline;
    }
  }
}
</style>
