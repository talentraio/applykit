import type { ExportFormat, Role } from '@int/schema';
import {
  EXPORT_FORMAT_MAP,
  OPERATION_MAP,
  PROVIDER_TYPE_MAP,
  USAGE_CONTEXT_MAP,
  USER_ROLE_MAP
} from '@int/schema';
import { generationRepository, vacancyRepository } from '../../../data/repositories';
import { exportResumeToPDF } from '../../../services/export/pdf';
import { requireLimit } from '../../../services/limits';
import { getStorage } from '../../../storage';
import { logExport } from '../../../utils/usage';

/**
 * POST /api/vacancies/:id/export
 *
 * Export tailored resume as PDF
 * Requires a valid generation for the vacancy
 *
 * Request body:
 * - format: 'ats' | 'human' (required)
 * - generationId?: string (optional, defaults to latest generation)
 *
 * Response:
 * - url: string (download URL for the PDF)
 * - filename: string (suggested filename)
 * - size: number (file size in bytes)
 * - format: 'ats' | 'human'
 * - expiresAt?: string (URL expiration time, if applicable)
 *
 * Related: T116 (US6)
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event);
  const userId = session.user.id;
  const userRole: Role = session.user.role ?? USER_ROLE_MAP.PUBLIC;

  // Get vacancy ID from route params
  const vacancyId = getRouterParam(event, 'id');
  if (!vacancyId) {
    throw createError({
      statusCode: 400,
      message: 'Vacancy ID is required'
    });
  }

  // Check rate limit for export operation
  await requireLimit(userId, OPERATION_MAP.EXPORT, userRole);

  // Verify vacancy belongs to user
  const vacancy = await vacancyRepository.findById(vacancyId);
  if (!vacancy) {
    throw createError({
      statusCode: 404,
      message: 'Vacancy not found'
    });
  }

  if (vacancy.userId !== userId) {
    throw createError({
      statusCode: 403,
      message: 'Access denied'
    });
  }

  // Read request body
  const body = await readBody(event);
  const { format, generationId } = body;

  // Validate format
  if (!isExportFormat(format)) {
    throw createError({
      statusCode: 400,
      message: 'Export format is required and must be "ats" or "human"'
    });
  }

  const exportFormat = format;

  // Get generation
  let generation;
  if (generationId) {
    // Use specified generation
    generation = await generationRepository.findById(generationId);
    if (!generation) {
      throw createError({
        statusCode: 404,
        message: 'Generation not found'
      });
    }
    if (generation.vacancyId !== vacancyId) {
      throw createError({
        statusCode: 400,
        message: 'Generation does not belong to this vacancy'
      });
    }
  } else {
    // Use latest generation
    generation = await generationRepository.findLatestByVacancyId(vacancyId);
    if (!generation) {
      throw createError({
        statusCode: 404,
        message: 'No generation found for this vacancy. Please generate a tailored resume first.'
      });
    }
  }

  // Check if generation is expired
  const now = new Date();
  if (generation.expiresAt < now) {
    throw createError({
      statusCode: 410,
      message: 'Generation has expired. Please regenerate the tailored resume.'
    });
  }

  try {
    // Generate PDF
    const pdfResult = await exportResumeToPDF(generation.content, {
      format: exportFormat,
      title: `${generation.content.personalInfo.fullName} - ${vacancy.company}${vacancy.jobPosition ? ` - ${vacancy.jobPosition}` : ''}`
    });

    // Upload to storage
    const storage = getStorage();
    const storagePath = `exports/${userId}/${generation.id}-${exportFormat}.pdf`;

    const downloadUrl = await storage.put(storagePath, pdfResult.buffer, {
      contentType: 'application/pdf',
      cacheControl: 'public, max-age=3600', // Cache for 1 hour
      metadata: {
        userId,
        vacancyId,
        generationId: generation.id,
        format: exportFormat
      }
    });

    // Log usage
    await logExport(userId, PROVIDER_TYPE_MAP.PLATFORM, USAGE_CONTEXT_MAP.EXPORT, pdfResult.size);

    // Return download URL and metadata
    return {
      url: downloadUrl,
      filename: pdfResult.filename,
      size: pdfResult.size,
      format: exportFormat,
      // Note: Vercel Blob URLs don't expire by default, but we could implement
      // temporary URLs in the future if needed
      expiresAt: undefined
    };
  } catch (error) {
    console.error('Export error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      throw createError({
        statusCode: 500,
        message: `PDF export failed: ${error.message}`
      });
    }

    throw createError({
      statusCode: 500,
      message: 'PDF export failed'
    });
  }
});

const exportFormatValues: ReadonlyArray<ExportFormat> = Object.values(EXPORT_FORMAT_MAP);

function isExportFormat(value: unknown): value is ExportFormat {
  return typeof value === 'string' && exportFormatValues.includes(value as ExportFormat);
}
