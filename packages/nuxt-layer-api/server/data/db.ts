import process from 'node:process';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Database connection with environment-based configuration
 *
 * - PostgreSQL for all environments (connection string from runtimeConfig)
 *
 * Environment variables:
 * - NUXT_DATABASE_URL: PostgreSQL connection string
 * - NODE_ENV: 'production' or 'development'
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

// Type-safe database instance
type PostgresDB = ReturnType<typeof drizzlePostgres<typeof schema>>;

const db: PostgresDB = (() => {
  const runtimeConfig = useRuntimeConfig();
  const databaseUrl = runtimeConfig.databaseUrl;

  if (!databaseUrl) {
    throw new Error('runtimeConfig.databaseUrl is required (set NUXT_DATABASE_URL)');
  }

  const client = postgres(databaseUrl, {
    max: 10, // Connection pool size
    idle_timeout: 20,
    connect_timeout: 10
  });

  const instance = drizzlePostgres(client, { schema });

  console.warn(`🗄️  Database: PostgreSQL (${isDevelopment ? 'development' : 'production'})`);
  return instance;
})();

export { db };
