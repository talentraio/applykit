import type { ExportFormat, ResumeContent, ResumeFormatSettings } from '@int/schema';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { ExportFormatSchema, ResumeContentSchema, ResumeFormatSettingsSchema } from '@int/schema';
import { z } from 'zod';

export type PdfPayload = {
  format: ExportFormat;
  content: ResumeContent;
  settings?: Partial<ResumeFormatSettings>;
  photoUrl?: string;
  filename?: string;
};

type StoredPayload = {
  payload: PdfPayload;
  expiresAt: number;
};

const PdfPayloadSchema = z.object({
  format: ExportFormatSchema,
  content: ResumeContentSchema,
  settings: ResumeFormatSettingsSchema.partial().optional(),
  photoUrl: z.string().optional(),
  filename: z.string().optional()
});

const StoredPayloadSchema = z.object({
  payload: PdfPayloadSchema,
  expiresAt: z.number()
});

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const payloadStore = new Map<string, StoredPayload>();
const storeDir = join(process.cwd(), '.data', 'pdf');

async function ensureStoreDir(): Promise<void> {
  await fs.mkdir(storeDir, { recursive: true });
}

function getTokenPath(token: string): string {
  return join(storeDir, `${token}.json`);
}

export async function createPdfToken(
  payload: PdfPayload,
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

export async function getPdfPayload(token: string): Promise<PdfPayload | null> {
  const entry = payloadStore.get(token);
  if (entry) {
    if (Date.now() > entry.expiresAt) {
      payloadStore.delete(token);
      await deleteTokenFile(token);
      return null;
    }
    return entry.payload;
  }

  try {
    const raw = await fs.readFile(getTokenPath(token), 'utf8');
    const parsed = StoredPayloadSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      await deleteTokenFile(token);
      return null;
    }

    const stored = parsed.data;

    if (Date.now() > stored.expiresAt) {
      await deleteTokenFile(token);
      return null;
    }

    payloadStore.set(token, stored);
    return stored.payload;
  } catch {
    return null;
  }
}

export async function deletePdfPayload(token: string): Promise<void> {
  payloadStore.delete(token);
  await deleteTokenFile(token);
}

async function deleteTokenFile(token: string): Promise<void> {
  try {
    await fs.unlink(getTokenPath(token));
  } catch {
    // Ignore missing file
  }
}
