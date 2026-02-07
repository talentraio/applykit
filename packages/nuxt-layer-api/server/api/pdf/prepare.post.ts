import { ExportFormatSchema, ResumeContentSchema, SpacingSettingsSchema } from '@int/schema';
import { z } from 'zod';
import { createPdfToken } from '../../utils/pdf-store';

const PdfPrepareSchema = z.object({
  format: ExportFormatSchema,
  content: ResumeContentSchema,
  settings: SpacingSettingsSchema.partial().optional(),
  photoUrl: z.string().optional(),
  filename: z.string().optional()
});

export default defineEventHandler(async event => {
  await requireUserSession(event);

  const body = await readBody(event);
  const parsed = PdfPrepareSchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid PDF payload',
      data: parsed.error.flatten()
    });
  }

  const { token, expiresAt } = await createPdfToken(parsed.data);

  setResponseHeader(event, 'Cache-Control', 'no-store');

  return {
    token,
    expiresAt
  };
});
