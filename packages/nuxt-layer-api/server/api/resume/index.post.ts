import type { ResumeContent, Role, SourceFileType } from '@int/schema';
import { readFile } from 'node:fs/promises';
import {
  OPERATION_MAP,
  PROVIDER_TYPE_MAP,
  ResumeContentSchema,
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
 * POST /api/resume
 *
 * Create user's single resume by uploading and parsing a file
 * Or by providing JSON resume content directly
 *
 * Single resume per user: Returns 400 if resume already exists
 *
 * Request (file upload):
 * - Content-Type: multipart/form-data
 * - Fields:
 *   - file: File (DOCX or PDF)
 *   - title: string (optional, defaults to filename)
 *
 * Request (JSON):
 * - Content-Type: application/json
 * - Fields:
 *   - content: ResumeContent (validated JSON)
 *   - title: string (required)
 *   - sourceFileName: string (optional)
 *   - sourceFileType: 'docx' | 'pdf' (optional)
 *
 * Response:
 * - Resume object with parsed content
 * - 400: Resume already exists for this user
 * - 422: Parsing failed
 *
 * Rate limiting: Enforces daily parse limits per role (only for file upload)
 *
 * Related: T011 (US1)
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;
  const roleValidation = RoleSchema.safeParse(session.user?.role);
  const userRole: Role = roleValidation.success ? roleValidation.data : USER_ROLE_MAP.PUBLIC;

  // Check if user already has a resume (single resume per user)
  const existingResume = await resumeRepository.findLatestByUserId(userId);
  if (existingResume) {
    throw createError({
      statusCode: 400,
      message: 'User already has a resume. Use PUT to update or DELETE to remove it first.'
    });
  }

  const contentType = getHeader(event, 'content-type');

  // Handle file upload
  if (contentType?.includes('multipart/form-data')) {
    const { files, fields } = await readFiles(event);

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
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
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

    // Check rate limit
    await checkRateLimit(userId, OPERATION_MAP.PARSE, { maxRequests: 10, windowSeconds: 60 });

    try {
      // Read file buffer
      const buffer = await readFile(file.filepath);

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
      const titleArray = fields.title;
      const title =
        (Array.isArray(titleArray) && titleArray[0]) ||
        file.originalFilename?.replace(/\.(docx|pdf)$/i, '') ||
        'My Resume';

      // Create resume in database
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
  }

  // Handle JSON body
  if (contentType?.includes('application/json')) {
    const body = await readBody<{
      content: ResumeContent;
      title: string;
      sourceFileName?: string;
      sourceFileType?: SourceFileType;
    }>(event);

    // Validate content with Zod
    const contentValidation = ResumeContentSchema.safeParse(body.content);
    if (!contentValidation.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid resume content: ${contentValidation.error.message}`
      });
    }

    if (!body.title || typeof body.title !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'title field is required and must be a string'
      });
    }

    // Create resume in database
    const resume = await resumeRepository.create({
      userId,
      title: body.title,
      content: contentValidation.data,
      sourceFileName: body.sourceFileName || 'import.json',
      sourceFileType: body.sourceFileType || SOURCE_FILE_TYPE_MAP.PDF
    });

    return resume;
  }

  throw createError({
    statusCode: 400,
    message: 'Content-Type must be multipart/form-data or application/json'
  });
});
