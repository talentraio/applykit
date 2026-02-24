import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { z } from 'zod';

const JournalEntrySchema = z.object({
  idx: z.number(),
  version: z.string(),
  when: z.number(),
  tag: z.string(),
  breakpoints: z.boolean()
});

const JournalSchema = z.object({
  version: z.string(),
  dialect: z.string(),
  entries: z.array(JournalEntrySchema)
});

const JOURNAL_PATH = resolve(process.cwd(), 'server/data/migrations/meta/_journal.json');

const run = async (): Promise<void> => {
  const raw = await readFile(JOURNAL_PATH, 'utf8');
  const parsed = JournalSchema.parse(JSON.parse(raw));

  if (parsed.entries.length < 2) {
    return;
  }

  const lastIndex = parsed.entries.length - 1;
  const lastEntry = parsed.entries[lastIndex];
  if (!lastEntry) {
    return;
  }

  const maxPreviousWhen = parsed.entries
    .slice(0, lastIndex)
    .reduce((max, entry) => (entry.when > max ? entry.when : max), Number.NEGATIVE_INFINITY);

  if (!Number.isFinite(maxPreviousWhen) || lastEntry.when > maxPreviousWhen) {
    return;
  }

  const fixedWhen = maxPreviousWhen + 1000;
  const nextEntries = [...parsed.entries];
  nextEntries[lastIndex] = { ...lastEntry, when: fixedWhen };

  await writeFile(
    JOURNAL_PATH,
    `${JSON.stringify({ ...parsed, entries: nextEntries }, null, 2)}\n`,
    'utf8'
  );

  console.log(
    `[db:generate] Updated journal "when" for ${lastEntry.tag}: ${lastEntry.when} -> ${fixedWhen}`
  );
};

run().catch(error => {
  console.error('[db:generate] Failed to normalize migration journal:', error);
  process.exitCode = 1;
});
