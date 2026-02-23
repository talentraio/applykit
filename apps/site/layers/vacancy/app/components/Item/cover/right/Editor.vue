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
};
type EditorCommandChain = {
  focus: () => EditorCommandChain;
  toggleBulletList: () => EditorCommandChain;
  toggleOrderedList: () => EditorCommandChain;
};
type EditorLike = {
  extensionManager: {
    extensions: { name: string }[];
  };
  can: () => EditorCanCommands;
  chain: () => EditorCommandChain;
  isActive: (name: string) => boolean;
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
  &__editor .tiptap blockquote {
    line-height: var(--vacancy-cover-editor-line-height);
  }

  &__editor .tiptap p.is-empty::before {
    color: #9ca3af;
  }

  &__editor .tiptap p {
    margin: 0;
  }

  &__editor .tiptap p + p {
    margin-top: var(--vacancy-cover-editor-paragraph-spacing);
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
    &__editor .tiptap blockquote {
      line-height: var(--vacancy-cover-editor-mobile-line-height);
    }

    &__editor .tiptap p + p {
      margin-top: var(--vacancy-cover-editor-mobile-paragraph-spacing);
    }
  }
}
</style>
