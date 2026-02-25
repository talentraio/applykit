<template>
  <div class="vacancy-item-cover-right-editor" :style="editorVariables">
    <UEditor
      v-slot="{ editor }"
      v-model="contentMarkdown"
      content-type="markdown"
      :placeholder="t('vacancy.cover.editorPlaceholder')"
      :handlers="markdownEditorHandlers"
      :ui="markdownEditorUi"
      class="vacancy-item-cover-right-editor__editor"
    >
      <div class="vacancy-item-cover-right-editor__toolbar-wrap">
        <div class="vacancy-item-cover-right-editor__toolbar">
          <div class="vacancy-item-cover-right-editor__toolbar-group">
            <UButton
              size="sm"
              color="neutral"
              variant="ghost"
              icon="i-lucide-undo"
              :title="t('resume.history.undo')"
              :disabled="!editor || !editor.can().chain().focus().undo().run()"
              @click="editor?.chain().focus().undo().run()"
            />
            <UButton
              size="sm"
              color="neutral"
              variant="ghost"
              icon="i-lucide-redo"
              :title="t('resume.history.redo')"
              :disabled="!editor || !editor.can().chain().focus().redo().run()"
              @click="editor?.chain().focus().redo().run()"
            />
          </div>

          <div class="vacancy-item-cover-right-editor__toolbar-group">
            <UButton
              size="sm"
              color="neutral"
              variant="outline"
              icon="i-lucide-corner-down-left"
              :title="t('vacancy.cover.editorLineBreak')"
              :aria-label="t('vacancy.cover.editorLineBreak')"
              :disabled="!editor || !canInsertLineBreak(editor)"
              @click="insertLineBreak(editor)"
            />
          </div>

          <div class="vacancy-item-cover-right-editor__toolbar-group">
            <UButton
              v-if="editor?.isActive('link')"
              size="sm"
              color="neutral"
              variant="solid"
              icon="i-lucide-link"
              :title="t('vacancy.cover.editorUnlink')"
              :aria-label="t('vacancy.cover.editorUnlink')"
              :disabled="!editor || !canToggleLink(editor)"
              @click="toggleLink(editor)"
            />

            <UPopover
              v-else
              v-model:open="linkPopoverOpen"
              :content="{ side: 'bottom', align: 'start', sideOffset: 8 }"
              :ui="{ content: 'vacancy-item-cover-right-editor__link-popover' }"
            >
              <UButton
                size="sm"
                color="neutral"
                variant="outline"
                icon="i-lucide-link"
                :title="t('vacancy.cover.editorLink')"
                :aria-label="t('vacancy.cover.editorLink')"
                :disabled="!editor || !canToggleLink(editor)"
                @click="prepareLinkPopover(editor)"
              />

              <template #content>
                <div class="vacancy-item-cover-right-editor__link-popover-content">
                  <UInput
                    v-model="linkHrefInput"
                    :placeholder="t('vacancy.cover.editorLinkPlaceholder')"
                    class="w-full"
                    @keydown.enter.prevent="applyLink(editor)"
                  />

                  <div class="vacancy-item-cover-right-editor__link-popover-actions">
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      :label="t('vacancy.cover.editorLinkCancel')"
                      @click="closeLinkPopover"
                    />
                    <UButton
                      size="xs"
                      color="neutral"
                      :label="t('vacancy.cover.editorLinkApply')"
                      @click="applyLink(editor)"
                    />
                  </div>
                </div>
              </template>
            </UPopover>

            <UPopover
              v-model:open="textStylePopoverOpen"
              :content="{ side: 'bottom', align: 'start', sideOffset: 8 }"
              :ui="{ content: 'vacancy-item-cover-right-editor__text-style-popover' }"
            >
              <UButton
                size="sm"
                color="neutral"
                variant="outline"
                icon="i-lucide-heading"
                :label="getTextStyleTriggerLabel(editor)"
                :title="t('vacancy.cover.editorTextStyle')"
                :aria-label="t('vacancy.cover.editorTextStyle')"
                :disabled="!editor || !canUseTextStyles(editor)"
              />

              <template #content>
                <div class="vacancy-item-cover-right-editor__text-style-options">
                  <UButton
                    v-for="item in textStyleItems"
                    :key="item.value"
                    size="xs"
                    color="neutral"
                    :variant="isTextStyleActive(editor, item.value) ? 'solid' : 'ghost'"
                    :label="item.label"
                    @click="applyTextStyle(editor, item.value)"
                  />
                </div>
              </template>
            </UPopover>
          </div>

          <div class="vacancy-item-cover-right-editor__toolbar-group">
            <UButton
              size="sm"
              color="neutral"
              :variant="editor?.isActive('bold') ? 'solid' : 'outline'"
              icon="i-lucide-bold"
              title="Bold"
              @click="editor?.chain().focus().toggleBold().run()"
            />
            <UButton
              size="sm"
              color="neutral"
              :variant="editor?.isActive('italic') ? 'solid' : 'outline'"
              icon="i-lucide-italic"
              title="Italic"
              @click="editor?.chain().focus().toggleItalic().run()"
            />
            <UButton
              size="sm"
              color="neutral"
              :variant="editor?.isActive('underline') ? 'solid' : 'outline'"
              icon="i-lucide-underline"
              title="Underline"
              @click="editor?.chain().focus().toggleUnderline().run()"
            />
          </div>

          <div class="vacancy-item-cover-right-editor__toolbar-group">
            <UButton
              size="sm"
              color="neutral"
              :variant="editor?.isActive('bulletList') ? 'solid' : 'outline'"
              icon="i-lucide-list"
              title="Bullet list"
              @click="editor?.chain().focus().toggleBulletList().run()"
            />
            <UButton
              size="sm"
              color="neutral"
              :variant="editor?.isActive('orderedList') ? 'solid' : 'outline'"
              icon="i-lucide-list-ordered"
              title="Ordered list"
              @click="editor?.chain().focus().toggleOrderedList().run()"
            />
            <UButton
              size="sm"
              color="neutral"
              :variant="editor?.isActive('blockquote') ? 'solid' : 'outline'"
              icon="i-lucide-text-quote"
              title="Quote"
              @click="editor?.chain().focus().toggleBlockquote().run()"
            />
          </div>
        </div>
      </div>
    </UEditor>

    <p v-if="coverLetterSaving" class="vacancy-item-cover-right-editor__saving">
      {{ t('vacancy.resume.saving') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { SpacingSettings } from '@int/schema';
import { DefaultCoverLetterFormatSettings } from '@int/schema';
import { A4_HEIGHT_PX, MM_TO_PX } from '@site/base/app/constants/paper';

defineOptions({ name: 'VacancyItemCoverRightEditor' });

const props = defineProps<{
  coverLetterSaving: boolean;
  formatSettings: SpacingSettings;
}>();

const contentMarkdown = defineModel<string>({ required: true });
const { t } = useI18n();
const toast = useToast();
const linkPopoverOpen = ref(false);
const linkHrefInput = ref('');
const textStylePopoverOpen = ref(false);

const markdownEditorUi = {
  root: 'w-full',
  content: 'vacancy-item-cover-right-editor__content-shell',
  base: 'vacancy-item-cover-right-editor__content-base'
} as const;

const calculateParagraphSpacing = (blockSpacing: number): number => {
  return 0.6 + ((blockSpacing - 1) / 8) * 1.2;
};

const paragraphSpacing = computed(() =>
  calculateParagraphSpacing(props.formatSettings.blockSpacing)
);
const defaultParagraphSpacing = calculateParagraphSpacing(
  DefaultCoverLetterFormatSettings.blockSpacing
);
const defaultMarginXPx = DefaultCoverLetterFormatSettings.marginX * MM_TO_PX;
const defaultMarginYPx = DefaultCoverLetterFormatSettings.marginY * MM_TO_PX;

const editorVariables = computed<Record<string, string>>(() => {
  const marginXPx = props.formatSettings.marginX * MM_TO_PX;
  const marginYPx = props.formatSettings.marginY * MM_TO_PX;

  return {
    '--vacancy-cover-editor-margin-x': `${marginXPx}px`,
    '--vacancy-cover-editor-margin-y': `${marginYPx}px`,
    '--vacancy-cover-editor-font-size': `${props.formatSettings.fontSize}pt`,
    '--vacancy-cover-editor-line-height': String(props.formatSettings.lineHeight),
    '--vacancy-cover-editor-paragraph-spacing': `${paragraphSpacing.value}em`,
    '--vacancy-cover-editor-mobile-margin-x': `${defaultMarginXPx}px`,
    '--vacancy-cover-editor-mobile-margin-y': `${defaultMarginYPx}px`,
    '--vacancy-cover-editor-mobile-font-size': `${DefaultCoverLetterFormatSettings.fontSize}pt`,
    '--vacancy-cover-editor-mobile-line-height': String(
      DefaultCoverLetterFormatSettings.lineHeight
    ),
    '--vacancy-cover-editor-mobile-paragraph-spacing': `${defaultParagraphSpacing}em`,
    '--vacancy-cover-editor-page-height': `${A4_HEIGHT_PX}px`
  };
});

type ToggleListCommand = 'toggleBulletList' | 'toggleOrderedList';
type EditorCanCommands = {
  toggleBulletList: () => boolean;
  toggleOrderedList: () => boolean;
  setHardBreak: () => boolean;
};
type HeadingLevel = 1 | 2 | 3 | 4;
type TextStyleValue = 'paragraph' | `heading-${HeadingLevel}`;
type TextStyleItem = {
  value: TextStyleValue;
  label: string;
  shortLabel: string;
};
type EditorCommandChain = {
  focus: () => EditorCommandChain;
  toggleBulletList: () => EditorCommandChain;
  toggleOrderedList: () => EditorCommandChain;
  setHardBreak: () => EditorCommandChain;
  setParagraph: () => EditorCommandChain;
  setHeading: (attrs: { level: HeadingLevel }) => EditorCommandChain;
  setLink: (attrs: { href: string }) => EditorCommandChain;
  unsetLink: () => EditorCommandChain;
  extendMarkRange: (mark: string) => EditorCommandChain;
  run: () => boolean;
};
type EditorLike = {
  extensionManager: {
    extensions: { name: string }[];
  };
  state: {
    selection: {
      empty: boolean;
    };
  };
  can: () => EditorCanCommands;
  chain: () => EditorCommandChain;
  isActive: (name: string, attrs?: Record<string, unknown>) => boolean;
};

const textStyleItems = computed<TextStyleItem[]>(() => [
  {
    value: 'paragraph',
    label: t('vacancy.cover.editorTextStyleParagraph'),
    shortLabel: 'P'
  },
  {
    value: 'heading-1',
    label: t('vacancy.cover.editorTextStyleHeading1'),
    shortLabel: 'H1'
  },
  {
    value: 'heading-2',
    label: t('vacancy.cover.editorTextStyleHeading2'),
    shortLabel: 'H2'
  },
  {
    value: 'heading-3',
    label: t('vacancy.cover.editorTextStyleHeading3'),
    shortLabel: 'H3'
  },
  {
    value: 'heading-4',
    label: t('vacancy.cover.editorTextStyleHeading4'),
    shortLabel: 'H4'
  }
]);

const textStyleHeadingLevels: Record<Exclude<TextStyleValue, 'paragraph'>, HeadingLevel> = {
  'heading-1': 1,
  'heading-2': 2,
  'heading-3': 3,
  'heading-4': 4
};

const hasEditorExtension = (editor: EditorLike, extensionName: string): boolean =>
  editor.extensionManager.extensions.some(extension => extension.name === extensionName);

const canToggleList = (editor: EditorLike, command: ToggleListCommand): boolean => {
  return command === 'toggleBulletList'
    ? editor.can().toggleBulletList()
    : editor.can().toggleOrderedList();
};

const executeListToggle = (
  chain: EditorCommandChain,
  command: ToggleListCommand
): EditorCommandChain => {
  return command === 'toggleBulletList' ? chain.toggleBulletList() : chain.toggleOrderedList();
};

const createSafeListHandler = (
  listType: 'bulletList' | 'orderedList',
  command: ToggleListCommand
) => ({
  canExecute: (editor: EditorLike): boolean => {
    return hasEditorExtension(editor, listType) && canToggleList(editor, command);
  },
  execute: (editor: EditorLike) => executeListToggle(editor.chain().focus(), command),
  isActive: (editor: EditorLike): boolean => editor.isActive(listType),
  isDisabled: (editor: EditorLike): boolean => {
    return !hasEditorExtension(editor, listType) || editor.isActive('code');
  }
});

const canInsertLineBreak = (editor: EditorLike): boolean => {
  return hasEditorExtension(editor, 'hardBreak') && editor.can().setHardBreak();
};

const insertLineBreak = (editor: EditorLike | undefined): void => {
  if (!editor || !canInsertLineBreak(editor)) return;
  editor.chain().focus().setHardBreak().run();
};

const normalizeLinkHref = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(href).href;
  } catch {
    return null;
  }
};

const canToggleLink = (editor: EditorLike): boolean => {
  return hasEditorExtension(editor, 'link') && !editor.isActive('code');
};

const canUseTextStyles = (editor: EditorLike): boolean => {
  return hasEditorExtension(editor, 'paragraph') && hasEditorExtension(editor, 'heading');
};

const getActiveTextStyle = (editor: EditorLike | undefined): TextStyleValue => {
  if (!editor || !canUseTextStyles(editor)) {
    return 'paragraph';
  }

  if (editor.isActive('heading', { level: 1 })) return 'heading-1';
  if (editor.isActive('heading', { level: 2 })) return 'heading-2';
  if (editor.isActive('heading', { level: 3 })) return 'heading-3';
  if (editor.isActive('heading', { level: 4 })) return 'heading-4';

  return 'paragraph';
};

const isTextStyleActive = (editor: EditorLike | undefined, value: TextStyleValue): boolean => {
  return getActiveTextStyle(editor) === value;
};

const getTextStyleTriggerLabel = (editor: EditorLike | undefined): string => {
  const activeValue = getActiveTextStyle(editor);
  return textStyleItems.value.find(item => item.value === activeValue)?.shortLabel ?? 'P';
};

const applyTextStyle = (editor: EditorLike | undefined, value: TextStyleValue): void => {
  if (!editor || !canUseTextStyles(editor)) return;

  if (value === 'paragraph') {
    editor.chain().focus().setParagraph().run();
    textStylePopoverOpen.value = false;
  } else {
    const level = textStyleHeadingLevels[value];
    editor.chain().focus().setHeading({ level }).run();
    textStylePopoverOpen.value = false;
  }
};

const toggleLink = (editor: EditorLike | undefined): void => {
  if (!editor || !canToggleLink(editor)) return;

  if (editor.isActive('link')) {
    editor.chain().focus().unsetLink().run();
  }
};

const closeLinkPopover = (): void => {
  linkPopoverOpen.value = false;
  linkHrefInput.value = '';
};

const prepareLinkPopover = (editor: EditorLike | undefined): void => {
  if (!editor || !canToggleLink(editor)) {
    closeLinkPopover();
    return;
  }

  if (editor.state.selection.empty) {
    closeLinkPopover();
    toast.add({
      title: t('vacancy.cover.editorLinkSelectText'),
      color: 'warning',
      icon: 'i-lucide-info'
    });
    return;
  }

  linkPopoverOpen.value = true;
};

const applyLink = (editor: EditorLike | undefined): void => {
  if (!editor || !canToggleLink(editor)) {
    closeLinkPopover();
    return;
  }

  if (editor.state.selection.empty) {
    closeLinkPopover();
    toast.add({
      title: t('vacancy.cover.editorLinkSelectText'),
      color: 'warning',
      icon: 'i-lucide-info'
    });
    return;
  }

  const href = normalizeLinkHref(linkHrefInput.value);
  if (!href) {
    toast.add({
      title: t('vacancy.cover.editorLinkInvalid'),
      color: 'error',
      icon: 'i-lucide-alert-circle'
    });
    return;
  }

  editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  closeLinkPopover();
};

const markdownEditorHandlers = {
  bulletList: createSafeListHandler('bulletList', 'toggleBulletList'),
  orderedList: createSafeListHandler('orderedList', 'toggleOrderedList'),
  taskList: {
    canExecute: (): boolean => false,
    execute: (editor: EditorLike) => editor.chain(),
    isActive: (): boolean => false,
    isDisabled: (): boolean => true
  }
} as const;
</script>

<style lang="scss">
.vacancy-item-cover-right-editor {
  --vacancy-cover-editor-toolbar-sticky-top: -0.75rem;
  --vacancy-cover-editor-toolbar-height: 2.875rem;
  --vacancy-cover-editor-toolbar-bg: #667085;
  --vacancy-cover-editor-toolbar-border: #7b8291;
  --vacancy-cover-editor-toolbar-text: #e5e7eb;
  --vacancy-cover-editor-toolbar-separator: rgb(229 231 235 / 28%);
  --vacancy-cover-editor-toolbar-hover-bg: rgb(255 255 255 / 16%);
  --vacancy-cover-editor-toolbar-active-bg: rgb(255 255 255 / 28%);
  --vacancy-cover-editor-mobile-margin-x-compact: calc(
    var(--vacancy-cover-editor-mobile-margin-x) / 3
  );

  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 794px;
  min-height: 0;
  margin-inline: auto;

  &__editor {
    width: 100%;
  }

  &__toolbar-wrap {
    position: sticky;
    top: var(--vacancy-cover-editor-toolbar-sticky-top);
    z-index: 8;
    margin-bottom: calc(-1 * var(--vacancy-cover-editor-toolbar-height));
    pointer-events: none;
    overflow: visible;

    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      height: var(--vacancy-cover-editor-toolbar-height);
      background: linear-gradient(
        to bottom,
        rgb(255 255 255 / 100%) 0%,
        rgb(255 255 255 / 100%) 80%,
        rgb(255 255 255 / 70%) 100%
      );
      pointer-events: none;
      z-index: 0;
    }
  }

  &__toolbar {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 0.5rem;
    min-height: var(--vacancy-cover-editor-toolbar-height);
    box-sizing: border-box;
    border: 1px solid var(--vacancy-cover-editor-toolbar-border);
    border-radius: 0;
    padding: 0.5rem 0.75rem;
    overflow-x: auto;
    position: relative;
    z-index: 1;
    background-color: var(--vacancy-cover-editor-toolbar-bg);
    opacity: 0.7;
    pointer-events: auto;

    :where([data-slot='base']) {
      color: var(--vacancy-cover-editor-toolbar-text) !important;
      border-color: rgb(255 255 255 / 25%) !important;
      background-color: transparent !important;
    }

    :where([data-slot='base']:hover) {
      background-color: var(--vacancy-cover-editor-toolbar-hover-bg) !important;
    }

    :where([data-slot='base'][class*='bg-default']) {
      background-color: var(--vacancy-cover-editor-toolbar-active-bg) !important;
      border-color: rgb(255 255 255 / 36%) !important;
    }

    :where([data-slot='base']:disabled, [data-slot='base'][aria-disabled='true']) {
      color: rgb(229 231 235 / 52%) !important;
      border-color: rgb(255 255 255 / 18%) !important;
      background-color: transparent !important;
      opacity: 1 !important;
    }
  }

  &__content-shell {
    width: 100%;
    display: block;
  }

  &__content-base {
    min-height: 100%;
  }

  &__editor [data-slot='root'] {
    overflow: visible;
  }

  &__editor [data-slot='content'] {
    width: 100%;
    min-height: var(--vacancy-cover-editor-page-height);
    position: relative;
    background-color: #fff;
    border: 1px solid #e5e7eb;
    box-shadow:
      0 4px 6px -1px rgb(0 0 0 / 10%),
      0 2px 4px -1px rgb(0 0 0 / 6%);
    box-sizing: border-box;
  }

  &__editor .tiptap {
    min-height: var(--vacancy-cover-editor-page-height);
    box-sizing: border-box;
    padding: var(--vacancy-cover-editor-margin-y) var(--vacancy-cover-editor-margin-x);
    font-family: Manrope, 'Segoe UI', sans-serif;
    font-size: var(--vacancy-cover-editor-font-size);
    line-height: var(--vacancy-cover-editor-line-height);
    background-color: #fff;
    color: #1f2937;
  }

  &__editor .tiptap,
  &__editor .tiptap p,
  &__editor .tiptap li,
  &__editor .tiptap blockquote,
  &__editor .tiptap h1,
  &__editor .tiptap h2,
  &__editor .tiptap h3,
  &__editor .tiptap h4 {
    line-height: var(--vacancy-cover-editor-line-height);
  }

  &__editor .tiptap p.is-empty::before {
    color: #9ca3af;
  }

  &__editor .tiptap p {
    margin: 0;
  }

  &__editor .tiptap > :is(p, ul, ol, blockquote, h1, h2, h3, h4) {
    margin: 0;
  }

  &__editor
    .tiptap
    > :is(p, ul, ol, blockquote, h1, h2, h3, h4)
    + :is(p, ul, ol, blockquote, h1, h2, h3, h4) {
    margin-top: var(--vacancy-cover-editor-paragraph-spacing);
  }

  &__editor .tiptap :is(h1, h2, h3, h4) {
    color: #1f2937;
  }

  &__editor .tiptap ul,
  &__editor .tiptap ol {
    margin: 0;
    padding-left: 1.5em;
    list-style-position: outside;
  }

  &__editor .tiptap ul {
    list-style-type: disc;
  }

  &__editor .tiptap ol {
    list-style-type: decimal;
  }

  &__editor .tiptap li {
    display: list-item;
    margin: 0;
    padding: 0;
    color: #1f2937;
  }

  &__editor .tiptap li::marker {
    color: currentcolor;
  }

  &__editor .tiptap li + li {
    margin-top: 0.3em;
  }

  &__editor .tiptap li > p {
    margin: 0;
  }

  &__editor .tiptap a {
    color: #2563eb;
    text-decoration: underline;
    text-underline-offset: 2px;
    overflow-wrap: anywhere;
  }

  &__toolbar-group {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 0.375rem;
  }

  &__toolbar-group + &__toolbar-group {
    border-left: 1px solid var(--vacancy-cover-editor-toolbar-separator);
    margin-left: 0.25rem;
    padding-left: 0.5rem;
  }

  &__saving {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--ui-text-muted);
  }

  &__text-style-popover {
    padding: 0.375rem;
    border: 1px solid var(--ui-border-muted);
    background-color: var(--ui-bg-elevated);
  }

  &__text-style-options {
    display: grid;
    grid-template-columns: minmax(8rem, 1fr);
    gap: 0.25rem;
  }

  @media (width <= 1023px) {
    &__editor .tiptap {
      padding: var(--vacancy-cover-editor-mobile-margin-y)
        var(--vacancy-cover-editor-mobile-margin-x-compact);
      font-size: var(--vacancy-cover-editor-mobile-font-size);
      line-height: var(--vacancy-cover-editor-mobile-line-height);
    }

    &__editor .tiptap,
    &__editor .tiptap p,
    &__editor .tiptap li,
    &__editor .tiptap blockquote,
    &__editor .tiptap h1,
    &__editor .tiptap h2,
    &__editor .tiptap h3,
    &__editor .tiptap h4 {
      line-height: var(--vacancy-cover-editor-mobile-line-height);
    }

    &__editor
      .tiptap
      > :is(p, ul, ol, blockquote, h1, h2, h3, h4)
      + :is(p, ul, ol, blockquote, h1, h2, h3, h4) {
      margin-top: var(--vacancy-cover-editor-mobile-paragraph-spacing);
    }
  }
}
</style>
