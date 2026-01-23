/**
 * Storage Adapter Interface
 *
 * Abstract interface for file storage operations
 * Supports multiple backends (Vercel Blob, local filesystem, etc.)
 */
import type { Buffer } from 'node:buffer'

/**
 * Storage adapter for file operations
 */
export type StorageAdapter = {
  /**
   * Upload a file to storage
   * @param path - Unique path/key for the file (e.g., "exports/user-123/gen-456-ats.pdf")
   * @param data - File content as Buffer or Blob
   * @param options - Optional metadata (contentType, etc.)
   * @returns URL where the file can be accessed
   */
  put: (path: string, data: Buffer | Blob, options?: PutOptions) => Promise<string>

  /**
   * Retrieve a file from storage
   * @param path - Path/key of the file
   * @returns File content as Buffer, or null if not found
   */
  get: (path: string) => Promise<Buffer | null>

  /**
   * Delete a file from storage
   * @param path - Path/key of the file to delete
   * @returns true if deleted, false if file didn't exist
   */
  delete: (path: string) => Promise<boolean>

  /**
   * Get public URL for a file
   * @param path - Path/key of the file
   * @returns Public URL to access the file
   */
  getUrl: (path: string) => Promise<string>

  /**
   * List files matching a prefix
   * @param prefix - Path prefix to match (e.g., "exports/user-123/")
   * @returns Array of file paths
   */
  list: (prefix: string) => Promise<string[]>

  /**
   * Delete multiple files matching a prefix
   * @param prefix - Path prefix to match
   * @returns Number of files deleted
   */
  deleteByPrefix: (prefix: string) => Promise<number>
}

/**
 * Options for put operation
 */
export type PutOptions = {
  /**
   * Content type / MIME type
   * Example: "application/pdf", "image/png"
   */
  contentType?: string

  /**
   * Cache control header
   * Example: "public, max-age=31536000"
   */
  cacheControl?: string

  /**
   * Custom metadata
   */
  metadata?: Record<string, string>
}

/**
 * Storage adapter factory configuration
 */
export type StorageConfig = {
  /**
   * Storage backend type
   */
  type: 'vercel-blob' | 'local'

  /**
   * Backend-specific configuration
   */
  options?: Record<string, unknown>
}
