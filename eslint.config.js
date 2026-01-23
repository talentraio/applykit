import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    typescript: true,
    vue: true,
    rules: {
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
      html: true,
      markdown: true
    },
    ignores: [
      '**/node_modules/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/dist/**',
      '**/.cache/**',
      '**/coverage/**'
    ]
  },
  {
    files: ['**/*.{ts,tsx,vue}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }]
    }
  }
)
