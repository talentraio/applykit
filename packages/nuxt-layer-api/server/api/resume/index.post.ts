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
import { format } from 'date-fns';
import { readFiles } from 'h3-formidable';
import { resumeRepository, userRepository } from '../../data/repositories';
import { parseResumeWithLLM } from '../../services/llm/parse';
import { parseDocument } from '../../services/parser';
import { checkRateLimit } from '../../utils/rate-limiter';
import { logUsage } from '../../utils/usage';

const RESUME_LIMIT = 10;

/**
 * POST /api/resume
 *
 * Create a new resume by uploading and parsing a file, or by providing JSON content.
 * Always creates new resume (no upsert).
 * Auto-sets as default if first resume.
 * Generates name from dd.MM.yyyy.
 * Enforces 10-resume limit.
 * Response includes name and isDefault.
 *
 * Deprecated: Callers should migrate to multi-resume flows.
 *
 * Request (file upload):
 * - Content-Type: multipart/form-data
 * - Fields: file (DOCX/PDF), title (optional)
 *
 * Request (JSON):
 * - Content-Type: application/json
 * - Fields: content, title, sourceFileName?, sourceFileType?
 *
 * Response: Resume with name and isDefault
 * Errors: 400, 409 (limit), 422
 */
const hasStatusCode = (value: unknown): value is { statusCode: number } => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'statusCode') === 'number'
  );
};

export default defineEventHandler(async event => {
  // Deprecation headers
  setHeader(event, 'Deprecation', 'true');
  setHeader(event, 'Link', '</api/resumes>; rel="successor-version"');

  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;
  const roleValidation = RoleSchema.safeParse(session.user?.role);
  const userRole: Role = roleValidation.success ? roleValidation.data : USER_ROLE_MAP.PUBLIC;

  // Check resume limit
  const currentCount = await resumeRepository.countByUserIdExact(userId);
  if (currentCount >= RESUME_LIMIT) {
    throw createError({
      statusCode: 409,
      message: `Resume limit reached. Maximum ${RESUME_LIMIT} resumes allowed.`
    });
  }

  const isFirstResume = currentCount === 0;
  const generatedName = format(new Date(), 'dd.MM.yyyy');

  const contentType = getHeader(event, 'content-type');

  // Handle file upload
  if (contentType?.includes('multipart/form-data')) {
    const { files, fields } = await readFiles(event);

    const fileArray = files.file;
    if (!fileArray || fileArray.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'No file uploaded'
      });
    }

    const file = fileArray[0];

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

    const fileTypeValidation = SourceFileTypeSchema.safeParse(fileType);
    if (!fileTypeValidation.success) {
      throw createError({
        statusCode: 400,
        message: 'Invalid file type'
      });
    }

    await checkRateLimit(userId, OPERATION_MAP.PARSE, { maxRequests: 10, windowSeconds: 60 });

    try {
      const buffer = await readFile(file.filepath);
      const parseResult = await parseDocument(buffer, fileType);
      const llmResult = await parseResumeWithLLM(parseResult.text, {
        userId,
        role: userRole
      });

      const titleArray = fields.title;
      const title =
        (Array.isArray(titleArray) && titleArray[0]) ||
        file.originalFilename?.replace(/\.(docx|pdf)$/i, '') ||
        'My Resume';

      const sourceFileName = file.originalFilename || 'unknown';

      // Always create new resume (no upsert)
      const resume = await resumeRepository.create({
        userId,
        title,
        content: llmResult.content,
        sourceFileName,
        sourceFileType: fileType,
        name: generatedName
      });

      // Auto-set as default if first resume
      if (isFirstResume) {
        await userRepository.updateDefaultResumeId(userId, resume.id);
      }

      await logUsage(
        userId,
        OPERATION_MAP.PARSE,
        PROVIDER_TYPE_MAP.PLATFORM,
        USAGE_CONTEXT_MAP.RESUME_BASE,
        llmResult.tokensUsed,
        llmResult.cost
      );

      return {
        ...resume,
        isDefault: isFirstResume
      };
    } catch (error) {
      if (hasStatusCode(error)) {
        throw error;
      }

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

    const sourceFileName = body.sourceFileName || 'import.json';
    const sourceFileType = body.sourceFileType || SOURCE_FILE_TYPE_MAP.PDF;

    // Always create new resume (no upsert)
    const resume = await resumeRepository.create({
      userId,
      title: body.title,
      content: contentValidation.data,
      sourceFileName,
      sourceFileType,
      name: generatedName
    });

    // Auto-set as default if first resume
    if (isFirstResume) {
      await userRepository.updateDefaultResumeId(userId, resume.id);
    }

    return {
      ...resume,
      isDefault: isFirstResume
    };
  }

  throw createError({
    statusCode: 400,
    message: 'Content-Type must be multipart/form-data or application/json'
  });
});
