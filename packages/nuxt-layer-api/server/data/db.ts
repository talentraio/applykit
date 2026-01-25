import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import Database from 'better-sqlite3';
import { drizzle as drizzleSQLite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Database connection with environment-based configuration
 *
 * - SQLite for local development (path from runtimeConfig.db.sqlitePath)
 * - PostgreSQL for production (connection string from runtimeConfig)
 *
 * Environment variables:
 * - NUXT_DATABASE_URL: PostgreSQL connection string (production)
 * - NODE_ENV: 'production' or 'development'
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

// Type-safe database instance - use PostgreSQL type for consistency
type PostgresDB = ReturnType<typeof drizzlePostgres<typeof schema>>;

const db = (() => {
  const runtimeConfig = useRuntimeConfig();
  const sqlitePath = runtimeConfig.db?.sqlitePath;
  const databaseUrl = runtimeConfig.databaseUrl;

  if (isDevelopment && !databaseUrl) {
    // SQLite for local development
    if (!sqlitePath) {
      throw new Error('runtimeConfig.db.sqlitePath is required for SQLite local development');
    }

    const dbDir = dirname(sqlitePath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    const sqlite = new Database(sqlitePath);
    sqlite.pragma('journal_mode = WAL'); // Better concurrency
    const instance = drizzleSQLite(sqlite, { schema });

    console.warn(`🗄️  Database: SQLite (local development) at ${sqlitePath}`);
    return instance;
  }

  // PostgreSQL for production
  if (!databaseUrl) {
    throw new Error('NUXT_DATABASE_URL environment variable is required for production');
  }

  const client = postgres(databaseUrl, {
    max: 10, // Connection pool size
    idle_timeout: 20,
    connect_timeout: 10
  });

  const instance = drizzlePostgres(client, { schema });

  console.warn('🗄️  Database: PostgreSQL (production)');
  return instance;
})() as PostgresDB;

export { db };
