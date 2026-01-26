import type { Role } from '@int/schema';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { RoleSchema } from '@int/schema';
import Database from 'better-sqlite3';
import { z } from 'zod';

type RawArgs = {
  email?: string;
  role?: string;
  dbPath?: string;
  help?: boolean;
};

type UserRow = {
  id: string;
  email: string;
  role: Role;
};

const DEFAULT_DB_PATH = fileURLToPath(new URL('../.data/local.db', import.meta.url));
const cliSchema = z.object({
  email: z.string().email(),
  role: RoleSchema,
  dbPath: z.string().optional()
});

const rawArgs = parseArgs(process.argv.slice(2));

if (rawArgs.help) {
  printUsage();
  process.exit(0);
}

const parsed = cliSchema.safeParse({
  email: rawArgs.email,
  role: rawArgs.role,
  dbPath: rawArgs.dbPath
});

if (!parsed.success) {
  console.error('Invalid arguments.');
  for (const issue of parsed.error.issues) {
    console.error(`- ${issue.path.join('.') || 'arg'}: ${issue.message}`);
  }
  printUsage();
  process.exit(1);
}

const dbPath = parsed.data.dbPath ? resolve(process.cwd(), parsed.data.dbPath) : DEFAULT_DB_PATH;

if (!existsSync(dbPath)) {
  console.error(`Database not found: ${dbPath}`);
  console.error('Start the app once to create the local SQLite database.');
  process.exit(1);
}

const db = new Database(dbPath);

try {
  const selectUser = db.prepare<[string], UserRow>(
    'select id, email, role from users where email = ?'
  );
  const user = selectUser.get(parsed.data.email);

  if (!user) {
    console.error(`User not found: ${parsed.data.email}`);
    process.exit(1);
  }

  if (user.role === parsed.data.role) {
    console.log(`Role already set: ${user.email} -> ${user.role}`);
    process.exit(0);
  }

  const updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const updateRole = db.prepare<[Role, string, string]>(
    'update users set role = ?, updated_at = ? where email = ?'
  );
  const result = updateRole.run(parsed.data.role, updatedAt, parsed.data.email);

  if (result.changes === 0) {
    console.error('No rows updated. Check the email and try again.');
    process.exit(1);
  }

  console.log(`Updated role: ${user.email} ${user.role} -> ${parsed.data.role}`);
} finally {
  db.close();
}

function parseArgs(argv: string[]): RawArgs {
  const result: RawArgs = {};
  const normalized = [...argv];

  if (normalized.length > 0 && !normalized[0].startsWith('-')) {
    result.email = normalized.shift();
  }

  if (normalized.length > 0 && !normalized[0].startsWith('-')) {
    result.role = normalized.shift();
  }

  for (let i = 0; i < normalized.length; i += 1) {
    const current = normalized[i];
    switch (current) {
      case '--email':
      case '-e':
        result.email = normalized[i + 1];
        i += 1;
        break;
      case '--role':
      case '-r':
        result.role = normalized[i + 1];
        i += 1;
        break;
      case '--db':
        result.dbPath = normalized[i + 1];
        i += 1;
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
      default:
        if (!current.startsWith('-')) {
          if (!result.email) {
            result.email = current;
          } else if (!result.role) {
            result.role = current;
          }
        }
        break;
    }
  }

  return result;
}

function printUsage(): void {
  console.log('Usage: pnpm --filter @int/api db:set-role -- --email <email> --role <role>');
  console.log('   or: pnpm --filter @int/api db:set-role -- <email> <role>');
  console.log('Options:');
  console.log('  --email, -e  User email');
  console.log('  --role, -r   Role: super_admin | friend | public');
  console.log('  --db         Path to SQLite database (optional)');
}
