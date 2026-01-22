import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  typescript: true,
  vue: true,
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
})
