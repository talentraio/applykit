import { readFiles } from 'h3-formidable'
import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import { SourceFileTypeSchema } from '@int/schema'
import { resumeRepository } from '../../data/repositories'
import { parseDocument } from '../../services/parser'
import { parseResumeWithLLM } from '../../services/llm/parse'
import { checkRateLimit } from '../../utils/rate-limiter'
import { logUsage } from '../../utils/usage'

/**
 * POST /api/resumes
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
 * Related: T074 (US2)
 */
export default defineEventHandler(async (event) => {
  // Require authentication
  const session = await requireUserSession(event)
  const userId = session.user.id

  // Check rate limit
  await checkRateLimit(event, userId, 'parse')

  // Parse multipart form data
  const { files } = await readFiles(event, {
    includeFields: true,
  })

  // Validate file upload
  const fileArray = files.file
  if (!fileArray || fileArray.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No file uploaded',
    })
  }

  const file = fileArray[0]

  // Determine file type from mimetype
  let fileType: 'docx' | 'pdf'
  if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    fileType = 'docx'
  }
  else if (file.mimetype === 'application/pdf') {
    fileType = 'pdf'
  }
  else {
    throw createError({
      statusCode: 400,
      message: `Unsupported file type: ${file.mimetype}. Only DOCX and PDF are supported.`,
    })
  }

  // Validate file type with schema
  const fileTypeValidation = SourceFileTypeSchema.safeParse(fileType)
  if (!fileTypeValidation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid file type',
    })
  }

  // Read file buffer
  const buffer = await readFile(file.filepath)

  try {
    // Parse document to plain text
    const parseResult = await parseDocument(buffer, fileType)

    // Get BYOK key from header if present
    const userApiKey = getHeader(event, 'x-api-key')

    // Parse with LLM
    const llmResult = await parseResumeWithLLM(parseResult.text, {
      userApiKey: userApiKey || undefined,
    })

    // Determine title (use provided or default to filename without extension)
    const title = file.originalFilename?.replace(/\.(docx|pdf)$/i, '') || 'Untitled Resume'

    // Save to database
    const resume = await resumeRepository.create({
      userId,
      title,
      content: llmResult.content,
      sourceFileName: file.originalFilename || 'unknown',
      sourceFileType: fileType,
    })

    // Log usage
    await logUsage({
      userId,
      operation: 'parse',
      provider: llmResult.provider,
      providerType: userApiKey ? 'byok' : 'platform',
      tokensUsed: llmResult.tokensUsed,
      cost: llmResult.cost,
      metadata: {
        resumeId: resume.id,
        fileType,
        wordCount: parseResult.metadata?.wordCount,
        pageCount: parseResult.metadata?.pageCount,
        attemptsUsed: llmResult.attemptsUsed,
      },
    })

    return resume
  }
  catch (error) {
    // Handle parsing errors
    if (error instanceof Error) {
      throw createError({
        statusCode: 422,
        message: `Failed to parse resume: ${error.message}`,
      })
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to parse resume',
    })
  }
})
