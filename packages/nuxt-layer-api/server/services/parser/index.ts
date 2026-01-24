import type { SourceFileType } from '@int/schema'
import type { Buffer } from 'node:buffer'
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'

/**
 * Document Parser Service
 *
 * Extracts plain text from DOCX and PDF files for LLM processing
 *
 * Supported formats:
 * - DOCX: Uses mammoth to extract text
 * - PDF: Uses pdf-parse to extract text
 *
 * Related: T070 (US2)
 */

/**
 * Parse error class
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public readonly fileType?: SourceFileType,
    public readonly code?:
      | 'UNSUPPORTED_FORMAT'
      | 'EMPTY_FILE'
      | 'CORRUPTED_FILE'
      | 'TOO_LARGE'
      | 'PARSE_FAILED'
  ) {
    super(message)
    this.name = 'ParseError'
  }
}

/**
 * Parse result
 */
export type ParseResult = {
  text: string
  metadata?: {
    pageCount?: number
    wordCount?: number
  }
}

/**
 * Maximum file size in bytes (10 MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Parse DOCX file to plain text
 *
 * @param buffer - File buffer
 * @returns Extracted text
 */
async function parseDocx(buffer: Buffer): Promise<ParseResult> {
  try {
    const result = await mammoth.extractRawText({ buffer })

    if (!result.value || result.value.trim().length === 0) {
      throw new ParseError('DOCX file contains no text', 'docx', 'EMPTY_FILE')
    }

    const wordCount = result.value.trim().split(/\s+/).length

    return {
      text: result.value,
      metadata: {
        wordCount
      }
    }
  } catch (error) {
    if (error instanceof ParseError) {
      throw error
    }

    throw new ParseError(
      `Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'docx',
      'PARSE_FAILED'
    )
  }
}

/**
 * Parse PDF file to plain text
 *
 * @param buffer - File buffer
 * @returns Extracted text
 */
async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  let parser: InstanceType<typeof PDFParse> | null = null

  try {
    // pdf-parse v2.x uses class-based API
    parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    const info = await parser.getInfo()

    if (!result.text || result.text.trim().length === 0) {
      throw new ParseError('PDF file contains no text', 'pdf', 'EMPTY_FILE')
    }

    const wordCount = result.text.trim().split(/\s+/).length

    return {
      text: result.text,
      metadata: {
        pageCount: info.total,
        wordCount
      }
    }
  } catch (error) {
    if (error instanceof ParseError) {
      throw error
    }

    throw new ParseError(
      `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'pdf',
      'PARSE_FAILED'
    )
  } finally {
    // Always destroy parser to free resources
    if (parser) {
      await parser.destroy()
    }
  }
}

/**
 * Parse document file to plain text
 *
 * @param buffer - File buffer
 * @param fileType - File type (docx or pdf)
 * @returns Parse result with extracted text
 * @throws ParseError if parsing fails
 */
export async function parseDocument(
  buffer: Buffer,
  fileType: SourceFileType
): Promise<ParseResult> {
  // Validate file size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new ParseError(
      `File size exceeds maximum allowed size (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      fileType,
      'TOO_LARGE'
    )
  }

  // Validate buffer
  if (buffer.length === 0) {
    throw new ParseError('File is empty', fileType, 'EMPTY_FILE')
  }

  // Parse based on file type
  switch (fileType) {
    case 'docx':
      return await parseDocx(buffer)

    case 'pdf':
      return await parsePdf(buffer)

    default:
      throw new ParseError(`Unsupported file type: ${fileType}`, fileType, 'UNSUPPORTED_FORMAT')
  }
}

/**
 * Validate file buffer and type
 *
 * @param buffer - File buffer
 * @param fileType - File type
 * @returns true if valid
 * @throws ParseError if invalid
 */
export function validateFile(buffer: Buffer, fileType: SourceFileType): boolean {
  // Check size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new ParseError(
      `File size exceeds maximum allowed size (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      fileType,
      'TOO_LARGE'
    )
  }

  // Check empty
  if (buffer.length === 0) {
    throw new ParseError('File is empty', fileType, 'EMPTY_FILE')
  }

  // Check supported format
  if (fileType !== 'docx' && fileType !== 'pdf') {
    throw new ParseError(`Unsupported file type: ${fileType}`, fileType, 'UNSUPPORTED_FORMAT')
  }

  return true
}
