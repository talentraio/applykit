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
    include: [
      'packages/*/tests/**/*.{test,spec}.{js,ts}',
      'packages/*/__tests__/**/*.{test,spec}.{js,ts}',
      'apps/*/tests/**/*.{test,spec}.{js,ts}',
      'tests/unit/**/*.{test,spec}.{js,ts}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**'
    ]
  },
  resolve: {
    alias: {
      '@int/schema': resolve(__dirname, './packages/schema'),
      '@int/api': resolve(__dirname, './packages/nuxt-layer-api'),
      '@int/ui': resolve(__dirname, './packages/nuxt-layer-ui')
    }
  }
})
