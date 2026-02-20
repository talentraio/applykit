import type { SourceFileType } from '@int/schema';
import type { Buffer } from 'node:buffer';
import { SOURCE_FILE_TYPE_MAP } from '@int/schema';
import mammoth from 'mammoth';
import { extractText, getDocumentProxy, getResolvedPDFJS } from 'unpdf';

/**
 * Document Parser Service
 *
 * Extracts plain text from DOCX and PDF files for LLM processing
 *
 * Supported formats:
 * - DOCX: Uses mammoth to extract text
 * - PDF: Uses unpdf (serverless-compatible) to extract text
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
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * Parse result
 */
export type ParseResult = {
  text: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
  };
};

/**
 * Maximum file size in bytes (10 MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Normalize extracted text for better LLM parsing quality
 * - Removes control characters
 * - Normalizes repeated whitespace
 */
function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\p{Cc}/gu, char => (char === '\n' || char === '\t' ? char : ' '))
    .replace(/\t/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Parse DOCX file to plain text
 *
 * @param buffer - File buffer
 * @returns Extracted text
 */
async function parseDocx(buffer: Buffer): Promise<ParseResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const normalizedText = normalizeExtractedText(result.value || '');

    if (normalizedText.length === 0) {
      throw new ParseError('DOCX file contains no text', SOURCE_FILE_TYPE_MAP.DOCX, 'EMPTY_FILE');
    }

    const wordCount = normalizedText.split(/\s+/).length;

    return {
      text: normalizedText,
      metadata: {
        wordCount
      }
    };
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }

    throw new ParseError(
      `Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`,
      SOURCE_FILE_TYPE_MAP.DOCX,
      'PARSE_FAILED'
    );
  }
}

/**
 * Parse PDF file to plain text
 * Uses unpdf which is serverless-compatible (no DOMMatrix dependency)
 *
 * @param buffer - File buffer
 * @returns Extracted text
 */
async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  try {
    const pdfjs = await getResolvedPDFJS();
    const pdf = await getDocumentProxy(new Uint8Array(buffer), {
      // Suppress noisy PDF.js font warnings (e.g. "TT: undefined function: 32")
      // while still surfacing real parsing errors through thrown exceptions.
      verbosity: pdfjs.VerbosityLevel.ERRORS
    });
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    const normalizedText = normalizeExtractedText(text);

    if (normalizedText.length === 0) {
      throw new ParseError('PDF file contains no text', SOURCE_FILE_TYPE_MAP.PDF, 'EMPTY_FILE');
    }

    const wordCount = normalizedText.split(/\s+/).length;

    return {
      text: normalizedText,
      metadata: {
        pageCount: totalPages,
        wordCount
      }
    };
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }

    throw new ParseError(
      `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      SOURCE_FILE_TYPE_MAP.PDF,
      'PARSE_FAILED'
    );
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
    );
  }

  // Validate buffer
  if (buffer.length === 0) {
    throw new ParseError('File is empty', fileType, 'EMPTY_FILE');
  }

  // Parse based on file type
  switch (fileType) {
    case SOURCE_FILE_TYPE_MAP.DOCX:
      return await parseDocx(buffer);

    case SOURCE_FILE_TYPE_MAP.PDF:
      return await parsePdf(buffer);

    default:
      throw new ParseError(`Unsupported file type: ${fileType}`, fileType, 'UNSUPPORTED_FORMAT');
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
    );
  }

  // Check empty
  if (buffer.length === 0) {
    throw new ParseError('File is empty', fileType, 'EMPTY_FILE');
  }

  // Check supported format
  if (fileType !== SOURCE_FILE_TYPE_MAP.DOCX && fileType !== SOURCE_FILE_TYPE_MAP.PDF) {
    throw new ParseError(`Unsupported file type: ${fileType}`, fileType, 'UNSUPPORTED_FORMAT');
  }

  return true;
}
