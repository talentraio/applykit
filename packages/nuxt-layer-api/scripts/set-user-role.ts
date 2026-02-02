import type { Role } from '@int/schema';
import process from 'node:process';
import { RoleSchema, USER_ROLE_MAP } from '@int/schema';
import postgres from 'postgres';
import { z } from 'zod';

type RawArgs = {
  email?: string;
  role?: string;
  databaseUrl?: string;
  help?: boolean;
};

type UserRow = {
  id: string;
  email: string;
  role: Role;
};

const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/resume_editor';
const cliSchema = z.object({
  email: z.string().email(),
  role: RoleSchema,
  databaseUrl: z.string().optional()
});

const rawArgs = parseArgs(process.argv.slice(2));

if (rawArgs.help) {
  printUsage();
  process.exit(0);
}

const parsed = cliSchema.safeParse({
  email: rawArgs.email,
  role: rawArgs.role,
  databaseUrl: rawArgs.databaseUrl
});

if (!parsed.success) {
  console.error('Invalid arguments.');
  for (const issue of parsed.error.issues) {
    console.error(`- ${issue.path.join('.') || 'arg'}: ${issue.message}`);
  }
  printUsage();
  process.exit(1);
}

const databaseUrl =
  parsed.data.databaseUrl ?? process.env.NUXT_DATABASE_URL ?? DEFAULT_DATABASE_URL;

const sql = postgres(databaseUrl, { max: 1 });

try {
  const users = await sql<UserRow[]>`
    select id, email, role
    from users
    where email = ${parsed.data.email}
    limit 1
  `;

  const user = users[0];

  if (!user) {
    console.error(`User not found: ${parsed.data.email}`);
    process.exit(1);
  }

  if (user.role === parsed.data.role) {
    console.log(`Role already set: ${user.email} -> ${user.role}`);
    process.exit(0);
  }

  const updates = await sql<{ id: string }[]>`
    update users
    set role = ${parsed.data.role}, updated_at = ${new Date()}
    where email = ${parsed.data.email}
    returning id
  `;

  if (updates.length === 0) {
    console.error('No rows updated. Check the email and try again.');
    process.exit(1);
  }

  console.log(`Updated role: ${user.email} ${user.role} -> ${parsed.data.role}`);
} finally {
  await sql.end({ timeout: 5 });
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
      case '--database-url':
      case '--url':
        result.databaseUrl = normalized[i + 1];
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
  console.log('  --email, -e        User email');
  console.log(`  --role, -r         Role: ${Object.values(USER_ROLE_MAP).join(' | ')}`);
  console.log('  --database-url     PostgreSQL connection string (optional)');
  console.log(`                     Default: ${DEFAULT_DATABASE_URL}`);
}
