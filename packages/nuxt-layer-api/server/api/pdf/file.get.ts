import type { PdfPayload } from '../../utils/pdf-store';
import { EXPORT_FORMAT_MAP } from '@int/schema';
import { exportResumeToPDFPreview } from '../../services/export/pdf';
import { deletePdfPayload, getPdfPayload } from '../../utils/pdf-store';

const DEFAULT_MARGIN_MM = 0;

export default defineEventHandler(async event => {
  await requireUserSession(event);

  const query = getQuery(event);
  const token = typeof query.token === 'string' ? query.token : '';

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Token is required'
    });
  }

  const payload = await getPdfPayload(token);
  if (!payload) {
    throw createError({
      statusCode: 404,
      message: 'PDF payload not found'
    });
  }

  const requestUrl = getRequestURL(event);
  const previewUrl = `${requestUrl.origin}/pdf/preview?token=${encodeURIComponent(token)}`;

  try {
    const result = await exportResumeToPDFPreview({
      previewUrl,
      format: payload.format,
      waitForSelector: '[data-pdf-ready="true"] .resume-preview[data-ready="true"]',
      margins: {
        top: DEFAULT_MARGIN_MM,
        right: DEFAULT_MARGIN_MM,
        bottom: DEFAULT_MARGIN_MM,
        left: DEFAULT_MARGIN_MM
      }
    });

    const filename = sanitizeFilename(payload.filename ?? getDefaultFilename(payload));

    setResponseHeader(event, 'Content-Type', 'application/pdf');
    setResponseHeader(event, 'Content-Disposition', `attachment; filename=\"${filename}\"`);
    setResponseHeader(event, 'Cache-Control', 'no-store');

    return send(event, result.buffer, 'application/pdf');
  } finally {
    await deletePdfPayload(token);
  }
});

function getDefaultFilename(payload: PdfPayload): string {
  const name = payload.content.personalInfo.fullName.replace(/[^a-z0-9]/gi, '_');
  const suffix = payload.format === EXPORT_FORMAT_MAP.ATS ? 'ATS' : 'Human';
  return `${name}_Resume_${suffix}.pdf`;
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^\w.\-]/g, '_');
}
