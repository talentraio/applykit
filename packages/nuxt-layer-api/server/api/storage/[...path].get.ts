import { promises as fs } from 'node:fs';
import { extname, join } from 'node:path';
import process from 'node:process';

/**
 * GET /api/storage/[...path]
 *
 * Serve files from local storage (development only)
 * In production, files are served directly from Vercel Blob
 *
 * Related: T116 (US6)
 */
export default defineEventHandler(async event => {
  // This endpoint is only for local development
  // In production, Vercel Blob returns direct URLs to blob storage
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (!isDevelopment) {
    throw createError({
      statusCode: 404,
      message: 'Not found'
    });
  }

  // Get file path from URL
  const url = getRequestURL(event);
  const urlPath = url.pathname;
  const prefix = '/api/storage/';

  if (!urlPath.startsWith(prefix)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request'
    });
  }

  // Decode the file path
  const filePath = decodeURIComponent(urlPath.slice(prefix.length));

  if (!filePath) {
    throw createError({
      statusCode: 400,
      message: 'Path is required'
    });
  }

  // Security: prevent path traversal
  if (filePath.includes('..') || filePath.startsWith('/')) {
    throw createError({
      statusCode: 400,
      message: 'Invalid path'
    });
  }

  // Get storage base directory
  const baseDir = join(process.cwd(), '.data', 'storage');
  const fullPath = join(baseDir, filePath);

  // Security: ensure the resolved path is still within baseDir
  if (!fullPath.startsWith(baseDir)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid path'
    });
  }

  try {
    // Read the file
    const buffer = await fs.readFile(fullPath);

    // Determine content type from extension
    const ext = extname(filePath).toLowerCase();
    const contentType = getContentType(ext);

    // Set response headers
    setResponseHeader(event, 'Content-Type', contentType);
    setResponseHeader(event, 'Content-Length', buffer.length);
    setResponseHeader(event, 'Cache-Control', 'public, max-age=3600');

    // For PDF files, set Content-Disposition for inline viewing
    if (ext === '.pdf') {
      const filename = filePath.split('/').pop() || 'document.pdf';
      setResponseHeader(event, 'Content-Disposition', `inline; filename="${filename}"`);
    }

    // Return the file buffer
    return send(event, buffer, contentType);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw createError({
        statusCode: 404,
        message: 'File not found'
      });
    }

    console.error('[Storage] Error reading file:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to read file'
    });
  }
});

/**
 * Get MIME content type from file extension
 */
function getContentType(ext: string): string {
  const contentTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
  };

  return contentTypes[ext] || 'application/octet-stream';
}
