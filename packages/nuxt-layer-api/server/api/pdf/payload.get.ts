import { getPdfPayload } from '../../utils/pdf-store';

export default defineEventHandler(async event => {
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

  setResponseHeader(event, 'Cache-Control', 'no-store');

  return payload;
});
