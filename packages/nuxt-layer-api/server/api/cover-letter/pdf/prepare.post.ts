import { SpacingSettingsSchema } from '@int/schema';
import { z } from 'zod';
import { createCoverLetterPdfToken } from '../../../utils/cover-letter-pdf-store';

const CoverLetterPdfPrepareSchema = z.object({
  contentMarkdown: z.string().min(1).max(20000),
  subjectLine: z.string().max(180).nullable().optional(),
  settings: SpacingSettingsSchema.partial().optional(),
  filename: z.string().optional()
});

export default defineEventHandler(async event => {
  await requireUserSession(event);

  const body = await readBody(event);
  const parsed = CoverLetterPdfPrepareSchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid cover letter PDF payload',
      data: parsed.error.flatten()
    });
  }

  const { token, expiresAt } = await createCoverLetterPdfToken(parsed.data);

  setResponseHeader(event, 'Cache-Control', 'no-store');

  return {
    token,
    expiresAt
  };
});
