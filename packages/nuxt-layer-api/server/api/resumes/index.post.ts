import type { Role, SourceFileType } from '@int/schema';
import { readFile } from 'node:fs/promises';
import {
  OPERATION_MAP,
  PROVIDER_TYPE_MAP,
  RoleSchema,
  SOURCE_FILE_TYPE_MAP,
  SourceFileTypeSchema,
  USAGE_CONTEXT_MAP,
  USER_ROLE_MAP
} from '@int/schema';
import { readFiles } from 'h3-formidable';
import { resumeRepository } from '../../data/repositories';
import { parseResumeWithLLM } from '../../services/llm/parse';
import { parseDocument } from '../../services/parser';
import { checkRateLimit } from '../../utils/rate-limiter';
import { logUsage } from '../../utils/usage';

/**
 * POST /api/resumes
 *
 * DEPRECATED: Use POST /api/resume instead
 *
 * Upload and parse a resume file (DOCX/PDF)
 *
 * Request:
 * - Content-Type: multipart/form-data
 * - Fields:
 *   - file: File (DOCX or PDF)
 *   - title: string (optional, defaults to filename)
 *
 * Response:
 * - Resume object with parsed content
 *
 * Rate limiting: Enforces daily parse limits per role
 *
 * This endpoint is deprecated and will be removed in a future version.
 * Migrate to the new singular /api/resume endpoint.
 *
 * Related: T074 (US2)
 */
export default defineEventHandler(async event => {
  // Add deprecation header
  setHeader(event, 'Deprecation', 'true');
  setHeader(event, 'Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString());
  setHeader(event, 'Link', '</api/resume>; rel="successor-version"');
  // Require authentication
  const session = await requireUserSession(event);
  const userId = getUserId(session);
  const roleValidation = RoleSchema.safeParse(session.user?.role);
  const userRole: Role = roleValidation.success ? roleValidation.data : USER_ROLE_MAP.PUBLIC;

  // Check rate limit
  await checkRateLimit(userId, OPERATION_MAP.PARSE, { maxRequests: 10, windowSeconds: 60 });

  // Parse multipart form data
  const { files } = await readFiles(event);

  // Validate file upload
  const fileArray = files.file;
  if (!fileArray || fileArray.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No file uploaded'
    });
  }

  const file = fileArray[0];

  // Determine file type from mimetype
  let fileType: SourceFileType;
  if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    fileType = SOURCE_FILE_TYPE_MAP.DOCX;
  } else if (file.mimetype === 'application/pdf') {
    fileType = SOURCE_FILE_TYPE_MAP.PDF;
  } else {
    throw createError({
      statusCode: 400,
      message: `Unsupported file type: ${file.mimetype}. Only DOCX and PDF are supported.`
    });
  }

  // Validate file type with schema
  const fileTypeValidation = SourceFileTypeSchema.safeParse(fileType);
  if (!fileTypeValidation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid file type'
    });
  }

  // Read file buffer
  const buffer = await readFile(file.filepath);

  try {
    // Parse document to plain text
    const parseResult = await parseDocument(buffer, fileType);

    // Get BYOK key from header if present
    const userApiKey = getHeader(event, 'x-api-key');

    // Parse with LLM
    const llmResult = await parseResumeWithLLM(parseResult.text, {
      userId,
      role: userRole,
      userApiKey: userApiKey || undefined
    });

    // Determine title (use provided or default to filename without extension)
    const title = file.originalFilename?.replace(/\.(docx|pdf)$/i, '') || 'Untitled Resume';

    // Save to database
    const resume = await resumeRepository.create({
      userId,
      title,
      content: llmResult.content,
      sourceFileName: file.originalFilename || 'unknown',
      sourceFileType: fileType
    });

    // Log usage
    await logUsage(
      userId,
      OPERATION_MAP.PARSE,
      userApiKey ? PROVIDER_TYPE_MAP.BYOK : PROVIDER_TYPE_MAP.PLATFORM,
      USAGE_CONTEXT_MAP.RESUME_BASE,
      llmResult.tokensUsed,
      llmResult.cost
    );

    return resume;
  } catch (error) {
    // Handle parsing errors
    if (error instanceof Error) {
      throw createError({
        statusCode: 422,
        message: `Failed to parse resume: ${error.message}`
      });
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to parse resume'
    });
  }
});
