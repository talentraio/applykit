import process from 'node:process'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/data/schema.ts',
  out: './server/data/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/resume_editor_dev'
  },
  verbose: true,
  strict: true
})
