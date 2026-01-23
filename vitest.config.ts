import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/**',
        '**/.nuxt/**',
        '**/.output/**',
        '**/dist/**',
        '**/*.config.{js,ts}',
        '**/tests/**',
        '**/.playground/**'
      ]
    },
    include: ['**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', '.nuxt', '.output', 'dist']
  },
  resolve: {
    alias: {
      '@int/schema': resolve(__dirname, './packages/schema'),
      '@int/api': resolve(__dirname, './packages/nuxt-layer-api'),
      '@int/ui': resolve(__dirname, './packages/nuxt-layer-ui')
    }
  }
})
