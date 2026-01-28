import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import process from 'node:process';
import {
  LLM_PROVIDER_MAP,
  OPERATION_MAP,
  PLATFORM_PROVIDER_MAP,
  PROVIDER_TYPE_MAP,
  SOURCE_FILE_TYPE_MAP,
  USAGE_CONTEXT_MAP,
  USER_ROLE_MAP,
  USER_STATUS_MAP,
  WORK_FORMAT_MAP
} from '@int/schema';
import Database from 'better-sqlite3';

/**
 * Nitro plugin for SQLite database initialization
 *
 * Runs once at server startup to ensure the SQLite database
 * exists and has all required tables for development mode.
 *
 * In production, PostgreSQL is used and this plugin does nothing.
 */
export default defineNitroPlugin(async () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const runtimeConfig = useRuntimeConfig();
  const databaseUrl = runtimeConfig.databaseUrl;

  // Skip in production (PostgreSQL is used)
  if (!isDevelopment || databaseUrl) {
    return;
  }

  const dbPath = runtimeConfig.db?.sqlitePath;

  if (!dbPath) {
    throw new Error('runtimeConfig.db.sqlitePath is required for SQLite local development');
  }

  // Create .data directory if it doesn't exist
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    await mkdir(dbDir, { recursive: true });
    console.warn(`Created database directory: ${dbDir}`);
  }

  // Check if database needs initialization
  const needsInit = !existsSync(dbPath) || isEmptyDatabase(dbPath);

  if (needsInit) {
    console.warn(`Initializing SQLite database at ${dbPath}...`);
  }

  const db = new Database(dbPath);
  const roleCheckList = Object.values(USER_ROLE_MAP)
    .map(role => `'${role}'`)
    .join(', ');
  const workFormatCheckList = Object.values(WORK_FORMAT_MAP)
    .map(format => `'${format}'`)
    .join(', ');
  const sourceFileTypeCheckList = Object.values(SOURCE_FILE_TYPE_MAP)
    .map(type => `'${type}'`)
    .join(', ');
  const llmProviderCheckList = Object.values(LLM_PROVIDER_MAP)
    .map(provider => `'${provider}'`)
    .join(', ');
  const operationCheckList = Object.values(OPERATION_MAP)
    .map(operation => `'${operation}'`)
    .join(', ');
  const providerTypeCheckList = Object.values(PROVIDER_TYPE_MAP)
    .map(type => `'${type}'`)
    .join(', ');
  const userStatusCheckList = Object.values(USER_STATUS_MAP)
    .map(status => `'${status}'`)
    .join(', ');
  const usageContextCheckList = Object.values(USAGE_CONTEXT_MAP)
    .map(context => `'${context}'`)
    .join(', ');
  const platformProviderCheckList = Object.values(PLATFORM_PROVIDER_MAP)
    .map(provider => `'${provider}'`)
    .join(', ');

  try {
    if (needsInit) {
      db.exec(`
      -- Users
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        google_id TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT '${USER_ROLE_MAP.PUBLIC}' CHECK(role IN (${roleCheckList})),
        status TEXT NOT NULL DEFAULT '${USER_STATUS_MAP.ACTIVE}' CHECK(status IN (${userStatusCheckList})),
        last_login_at TEXT,
        deleted_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Profiles
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        country TEXT NOT NULL,
        search_region TEXT NOT NULL,
        work_format TEXT NOT NULL CHECK(work_format IN (${workFormatCheckList})),
        languages TEXT NOT NULL,
        phones TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Resumes
      CREATE TABLE IF NOT EXISTS resumes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        source_file_name TEXT NOT NULL,
        source_file_type TEXT NOT NULL CHECK(source_file_type IN (${sourceFileTypeCheckList})),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
      CREATE INDEX IF NOT EXISTS idx_resumes_created_at ON resumes(created_at);

      -- Vacancies
      CREATE TABLE IF NOT EXISTS vacancies (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company TEXT NOT NULL,
        job_position TEXT,
        description TEXT NOT NULL,
        url TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_vacancies_user_id ON vacancies(user_id);
      CREATE INDEX IF NOT EXISTS idx_vacancies_created_at ON vacancies(created_at);

      -- Generations
      CREATE TABLE IF NOT EXISTS generations (
        id TEXT PRIMARY KEY,
        vacancy_id TEXT NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
        resume_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        match_score_before INTEGER NOT NULL,
        match_score_after INTEGER NOT NULL,
        generated_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_generations_vacancy_id ON generations(vacancy_id);
      CREATE INDEX IF NOT EXISTS idx_generations_resume_id ON generations(resume_id);
      CREATE INDEX IF NOT EXISTS idx_generations_generated_at ON generations(generated_at);
      CREATE INDEX IF NOT EXISTS idx_generations_expires_at ON generations(expires_at);

      -- LLM Keys
      CREATE TABLE IF NOT EXISTS llm_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL CHECK(provider IN (${llmProviderCheckList})),
        key_hint TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, provider)
      );
      CREATE INDEX IF NOT EXISTS idx_llm_keys_user_id ON llm_keys(user_id);

      -- Role Settings
      CREATE TABLE IF NOT EXISTS role_settings (
        role TEXT PRIMARY KEY CHECK(role IN (${roleCheckList})),
        platform_llm_enabled INTEGER NOT NULL DEFAULT 0,
        byok_enabled INTEGER NOT NULL DEFAULT 0,
        platform_provider TEXT NOT NULL CHECK(platform_provider IN (${platformProviderCheckList})),
        daily_budget_cap REAL NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Usage Logs
      CREATE TABLE IF NOT EXISTS usage_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        operation TEXT NOT NULL CHECK(operation IN (${operationCheckList})),
        provider_type TEXT NOT NULL CHECK(provider_type IN (${providerTypeCheckList})),
        usage_context TEXT CHECK(usage_context IN (${usageContextCheckList})),
        tokens_used INTEGER,
        cost REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_usage_logs_user_operation_date ON usage_logs(user_id, operation, created_at);

      -- System Config
      CREATE TABLE IF NOT EXISTS system_configs (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Initial data
      INSERT OR IGNORE INTO system_configs (key, value) VALUES
        ('global_budget_cap', '100'),
        ('global_budget_used', '0');
    `);
    }

    applySqliteMigrations(db, {
      roleCheckList,
      userStatusCheckList,
      usageContextCheckList,
      platformProviderCheckList
    });

    if (needsInit) {
      console.warn('SQLite database initialized successfully');
    }
  } finally {
    db.close();
  }
});

/**
 * Check if database file exists but has no tables
 */
function isEmptyDatabase(dbPath: string): boolean {
  try {
    const db = new Database(dbPath, { readonly: true });
    const result = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all();
    db.close();
    return result.length === 0;
  } catch {
    return true;
  }
}

type MigrationOptions = {
  roleCheckList: string;
  userStatusCheckList: string;
  usageContextCheckList: string;
  platformProviderCheckList: string;
};

function applySqliteMigrations(db: Database, options: MigrationOptions): void {
  const { roleCheckList, userStatusCheckList, usageContextCheckList, platformProviderCheckList } =
    options;

  ensureColumn(
    db,
    'users',
    'status',
    `TEXT NOT NULL DEFAULT '${USER_STATUS_MAP.ACTIVE}' CHECK(status IN (${userStatusCheckList}))`,
    () => {
      db.exec(`UPDATE users SET status = '${USER_STATUS_MAP.ACTIVE}' WHERE status IS NULL`);
    }
  );

  db.exec(`UPDATE users SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = ''`);

  ensureColumn(db, 'users', 'last_login_at', 'TEXT', () => {
    db.exec(`UPDATE users SET last_login_at = updated_at WHERE last_login_at IS NULL`);
  });

  ensureColumn(db, 'users', 'deleted_at', 'TEXT');

  ensureColumn(
    db,
    'usage_logs',
    'usage_context',
    `TEXT CHECK(usage_context IN (${usageContextCheckList}))`
  );

  db.exec(`
    CREATE TABLE IF NOT EXISTS role_settings (
      role TEXT PRIMARY KEY CHECK(role IN (${roleCheckList})),
      platform_llm_enabled INTEGER NOT NULL DEFAULT 0,
      byok_enabled INTEGER NOT NULL DEFAULT 0,
      platform_provider TEXT NOT NULL CHECK(platform_provider IN (${platformProviderCheckList})),
      daily_budget_cap REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO role_settings (role, platform_llm_enabled, byok_enabled, platform_provider, daily_budget_cap)
    VALUES
      ('super_admin', 1, 1, 'openai', 0),
      ('friend', 0, 0, 'openai', 0),
      ('public', 0, 0, 'openai', 0);

    DELETE FROM system_configs
    WHERE key IN ('platform_llm_enabled', 'byok_enabled', 'platform_provider');
  `);
}

function ensureColumn(
  db: Database,
  table: string,
  column: string,
  definition: string,
  onAdd?: () => void
): void {
  const exists = db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some(row => row.name === column);

  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    if (onAdd) {
      onAdd();
    }
  }
}
