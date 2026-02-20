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
 * POST /api/resumes
 *
 * Create a new resume by uploading/parsing a file, or by sending JSON content.
 * By default creates a new resume (no upsert).
 * If replaceResumeId is provided, replaces base data for an existing owned resume.
 * Auto-sets as default when creating the first resume.
 * Enforces 10-resume limit.
 *
 * Request (file upload):
 * - Content-Type: multipart/form-data
 * - Fields: file (DOCX/PDF), title (optional), replaceResumeId (optional)
 *
 * Request (JSON):
 * - Content-Type: application/json
 * - Fields: content, title, sourceFileName?, sourceFileType?, replaceResumeId?
 *
 * Response: Resume with computed isDefault flag.
 * Errors: 400, 404, 409 (limit), 422
 */
const hasStatusCode = (value: unknown): value is { statusCode: number } => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'statusCode') === 'number'
  );
};

const getFirstString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first : undefined;
  }

  return undefined;
};

export default defineEventHandler(async event => {
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;
  const roleValidation = RoleSchema.safeParse(session.user?.role);
  const userRole: Role = roleValidation.success ? roleValidation.data : USER_ROLE_MAP.PUBLIC;

  const contentType = getHeader(event, 'content-type');

  // Handle file upload
  if (contentType?.includes('multipart/form-data')) {
    const { files, fields } = await readFiles(event);
    const replaceResumeId = getFirstString(fields.replaceResumeId);
    const replaceTargetResume = replaceResumeId
      ? await resumeRepository.findByIdAndUserId(replaceResumeId, userId)
      : null;

    if (replaceResumeId && !replaceTargetResume) {
      throw createError({
        statusCode: 404,
        message: 'Resume not found'
      });
    }

    let isFirstResume = false;
    if (!replaceTargetResume) {
      const currentCount = await resumeRepository.countByUserIdExact(userId);
      if (currentCount >= RESUME_LIMIT) {
        throw createError({
          statusCode: 409,
          message: `Resume limit reached. Maximum ${RESUME_LIMIT} resumes allowed.`
        });
      }
      isFirstResume = currentCount === 0;
    }

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
        getFirstString(titleArray) ||
        file.originalFilename?.replace(/\.(docx|pdf)$/i, '') ||
        'My Resume';
      const generatedName = format(new Date(), 'dd.MM.yyyy');
      const normalizedTitle = title.trim();
      const name = normalizedTitle.length > 0 ? normalizedTitle : generatedName;

      const sourceFileName = file.originalFilename || 'unknown';

      if (replaceTargetResume) {
        const replacedResume = await resumeRepository.replaceBaseData(
          replaceTargetResume.id,
          userId,
          {
            title,
            content: llmResult.content,
            sourceFileName,
            sourceFileType: fileType
          }
        );

        if (!replacedResume) {
          throw createError({
            statusCode: 404,
            message: 'Resume not found'
          });
        }

        const defaultResumeId = await userRepository.getDefaultResumeId(userId);
        return {
          ...replacedResume,
          isDefault: replacedResume.id === defaultResumeId
        };
      }

      const resume = await resumeRepository.create({
        userId,
        title,
        content: llmResult.content,
        sourceFileName,
        sourceFileType: fileType,
        name
      });

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
      title?: string;
      name?: string;
      sourceFileName?: string;
      sourceFileType?: SourceFileType;
      replaceResumeId?: string;
    }>(event);

    const contentValidation = ResumeContentSchema.safeParse(body.content);
    if (!contentValidation.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid resume content: ${contentValidation.error.message}`
      });
    }

    const replaceTargetResume = body.replaceResumeId
      ? await resumeRepository.findByIdAndUserId(body.replaceResumeId, userId)
      : null;

    if (body.replaceResumeId && !replaceTargetResume) {
      throw createError({
        statusCode: 404,
        message: 'Resume not found'
      });
    }

    if (replaceTargetResume) {
      const sourceFileName = body.sourceFileName || replaceTargetResume.sourceFileName;
      const sourceFileType = body.sourceFileType || replaceTargetResume.sourceFileType;
      const title =
        typeof body.title === 'string' && body.title.trim().length > 0
          ? body.title.trim()
          : replaceTargetResume.title;

      const replacedResume = await resumeRepository.replaceBaseData(
        replaceTargetResume.id,
        userId,
        {
          title,
          content: contentValidation.data,
          sourceFileName,
          sourceFileType
        }
      );

      if (!replacedResume) {
        throw createError({
          statusCode: 404,
          message: 'Resume not found'
        });
      }

      const defaultResumeId = await userRepository.getDefaultResumeId(userId);
      return {
        ...replacedResume,
        isDefault: replacedResume.id === defaultResumeId
      };
    }

    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      throw createError({
        statusCode: 400,
        message: 'title field is required and must be a string'
      });
    }

    const currentCount = await resumeRepository.countByUserIdExact(userId);
    if (currentCount >= RESUME_LIMIT) {
      throw createError({
        statusCode: 409,
        message: `Resume limit reached. Maximum ${RESUME_LIMIT} resumes allowed.`
      });
    }

    const sourceFileName = body.sourceFileName || 'import.json';
    const sourceFileType = body.sourceFileType || SOURCE_FILE_TYPE_MAP.PDF;
    const generatedName = format(new Date(), 'dd.MM.yyyy');
    const normalizedTitle = body.title.trim();
    const normalizedName = typeof body.name === 'string' ? body.name.trim() : '';
    const name = normalizedName.length > 0 ? normalizedName : normalizedTitle || generatedName;
    const isFirstResume = currentCount === 0;

    const resume = await resumeRepository.create({
      userId,
      title: normalizedTitle,
      content: contentValidation.data,
      sourceFileName,
      sourceFileType,
      name
    });

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
