import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'
import { drizzle as drizzleSQLite } from 'drizzle-orm/better-sqlite3'
import postgres from 'postgres'
import Database from 'better-sqlite3'
import * as schema from './schema'

/**
 * Database connection with environment-based configuration
 *
 * - SQLite for local development (file: .data/local.db)
 * - PostgreSQL for production (connection string from env)
 *
 * Environment variables:
 * - DATABASE_URL: PostgreSQL connection string (production)
 * - NODE_ENV: 'production' or 'development'
 */

const isDevelopment = process.env.NODE_ENV !== 'production'
const databaseUrl = process.env.DATABASE_URL

// Type-safe database instance
type DB = ReturnType<typeof drizzlePostgres<typeof schema>> | ReturnType<typeof drizzleSQLite<typeof schema>>

let db: DB

if (isDevelopment && !databaseUrl) {
  // SQLite for local development
  const sqlite = new Database('.data/local.db')
  sqlite.pragma('journal_mode = WAL') // Better concurrency
  db = drizzleSQLite(sqlite, { schema })

  console.log('🗄️  Database: SQLite (local development)')
} else {
  // PostgreSQL for production
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required for production')
  }

  const client = postgres(databaseUrl, {
    max: 10, // Connection pool size
    idle_timeout: 20,
    connect_timeout: 10,
  })

  db = drizzlePostgres(client, { schema })

  console.log('🗄️  Database: PostgreSQL (production)')
}

export { db }
export type { DB }
