import antfu from '@antfu/eslint-config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default antfu(
  {
    type: 'lib',
    typescript: true,
    vue: true,
    rules: {
      'antfu/if-newline': 'off',
      'antfu/top-level-function': 'off',
      'ts/consistent-type-definitions': ['error', 'type'],
      'vue/block-order': ['error', { order: ['template', 'script', 'style'] }]
    },
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: false
    },
    formatters: {
      css: true,
      html: true
      // markdown: false - handled by Prettier only, not ESLint
    },
    ignores: [
      '**/node_modules/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/dist/**',
      '**/.cache/**',
      '**/coverage/**',
      '**/*.md' // Exclude markdown files from ESLint - handled by Prettier only
    ]
  },
  {
    files: ['**/*.{ts,tsx,vue}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }]
    }
  },
  {
    files: ['apps/**/*.{ts,tsx,vue}'],
    rules: {
      'ts/explicit-function-return-type': 'off'
    }
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      'ts/consistent-type-definitions': 'off'
    }
  }
).append(eslintConfigPrettier);
