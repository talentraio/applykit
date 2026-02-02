import process from 'node:process';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './server/data/schema.ts',
  out: './server/data/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.NUXT_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/resume_editor'
  },
  verbose: true,
  strict: true
});
