import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2026-01-22',

  alias: { '@site/base': fileURLToPath(new URL('./', import.meta.url)) }
})
