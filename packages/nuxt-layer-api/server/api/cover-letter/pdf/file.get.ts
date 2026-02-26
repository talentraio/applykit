import type { CoverLetterPdfPayload } from '../../../utils/cover-letter-pdf-store';
import { exportResumeToPDFPreview } from '../../../services/export/pdf';
import {
  deleteCoverLetterPdfPayload,
  getCoverLetterPdfPayload
} from '../../../utils/cover-letter-pdf-store';

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

  const payload = await getCoverLetterPdfPayload(token);
  if (!payload) {
    throw createError({
      statusCode: 404,
      message: 'Cover letter PDF payload not found'
    });
  }

  const requestUrl = getRequestURL(event);
  const previewUrl = `${requestUrl.origin}/cover-letter/pdf/preview?token=${encodeURIComponent(token)}`;

  try {
    const result = await exportResumeToPDFPreview({
      previewUrl,
      format: 'human',
      waitForSelector: '[data-cover-letter-pdf-ready="true"]',
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
    await deleteCoverLetterPdfPayload(token);
  }
});

function getDefaultFilename(payload: CoverLetterPdfPayload): string {
  if (!payload.subjectLine) {
    return 'Cover_Letter.pdf';
  }

  const normalized = payload.subjectLine.replace(/[^a-z0-9]/gi, '_');
  return `${normalized || 'Cover_Letter'}.pdf`;
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^\w.\-]/g, '_');
}
