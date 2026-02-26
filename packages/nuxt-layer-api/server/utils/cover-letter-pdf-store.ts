import type { SpacingSettings } from '@int/schema';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SpacingSettingsSchema } from '@int/schema';
import { z } from 'zod';

export type CoverLetterPdfPayload = {
  contentMarkdown: string;
  subjectLine?: string | null;
  settings?: Partial<SpacingSettings>;
  filename?: string;
};

type StoredPayload = {
  payload: CoverLetterPdfPayload;
  expiresAt: number;
};

const CoverLetterPdfPayloadSchema = z.object({
  contentMarkdown: z.string().min(1).max(20000),
  subjectLine: z.string().max(180).nullable().optional(),
  settings: SpacingSettingsSchema.partial().optional(),
  filename: z.string().optional()
});

const StoredPayloadSchema = z.object({
  payload: CoverLetterPdfPayloadSchema,
  expiresAt: z.number()
});

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const payloadStore = new Map<string, StoredPayload>();
const storeDir = join(tmpdir(), 'cover-letter-pdf-store');

async function ensureStoreDir(): Promise<void> {
  await fs.mkdir(storeDir, { recursive: true });
}

function getTokenPath(token: string): string {
  return join(storeDir, `${token}.json`);
}

export async function createCoverLetterPdfToken(
  payload: CoverLetterPdfPayload,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<{ token: string; expiresAt: number }> {
  const token = randomUUID();
  const expiresAt = Date.now() + ttlMs;

  payloadStore.set(token, { payload, expiresAt });

  await ensureStoreDir();
  await fs.writeFile(getTokenPath(token), JSON.stringify({ payload, expiresAt }), 'utf8');

  return {
    token,
    expiresAt
  };
}

export async function getCoverLetterPdfPayload(
  token: string
): Promise<CoverLetterPdfPayload | null> {
  const entry = payloadStore.get(token);
  if (entry) {
    if (Date.now() > entry.expiresAt) {
      payloadStore.delete(token);
      await deleteCoverLetterPdfPayload(token);
      return null;
    }

    return entry.payload;
  }

  try {
    const raw = await fs.readFile(getTokenPath(token), 'utf8');
    const parsed = StoredPayloadSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      await deleteCoverLetterPdfPayload(token);
      return null;
    }

    const stored = parsed.data;
    if (Date.now() > stored.expiresAt) {
      await deleteCoverLetterPdfPayload(token);
      return null;
    }

    payloadStore.set(token, stored);
    return stored.payload;
  } catch {
    return null;
  }
}

export async function deleteCoverLetterPdfPayload(token: string): Promise<void> {
  payloadStore.delete(token);

  try {
    await fs.unlink(getTokenPath(token));
  } catch {
    // Ignore missing file
  }
}
