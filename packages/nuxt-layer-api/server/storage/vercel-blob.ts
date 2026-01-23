import { put, del, head, list } from '@vercel/blob'
import type { StorageAdapter, PutOptions } from './types'

/**
 * Vercel Blob Storage Adapter
 *
 * Production storage backend using Vercel Blob Storage
 * Automatically uses BLOB_READ_WRITE_TOKEN from environment
 */
export class VercelBlobAdapter implements StorageAdapter {
  private token?: string

  constructor(token?: string) {
    // Token is optional - Vercel auto-detects in production
    this.token = token || process.env.BLOB_READ_WRITE_TOKEN
  }

  async put(path: string, data: Buffer | Blob, options?: PutOptions): Promise<string> {
    try {
      const blob = await put(path, data, {
        access: 'public',
        token: this.token,
        contentType: options?.contentType,
        cacheControlMaxAge: options?.cacheControl ? this.parseCacheControl(options.cacheControl) : undefined,
        addRandomSuffix: false, // We control the path exactly
      })

      return blob.url
    }
    catch (error) {
      throw new Error(`Failed to upload file to Vercel Blob: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async get(path: string): Promise<Buffer | null> {
    try {
      // First check if file exists
      const metadata = await head(path, { token: this.token })

      // Fetch the file content
      const response = await fetch(metadata.url)
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to fetch blob: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    }
    catch (error) {
      // If head() throws 404, file doesn't exist
      if (error instanceof Error && error.message.includes('not found')) {
        return null
      }
      throw new Error(`Failed to get file from Vercel Blob: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async delete(path: string): Promise<boolean> {
    try {
      // First get the full URL for this path
      const metadata = await head(path, { token: this.token })
      await del(metadata.url, { token: this.token })
      return true
    }
    catch (error) {
      // If file doesn't exist, return false
      if (error instanceof Error && error.message.includes('not found')) {
        return false
      }
      throw new Error(`Failed to delete file from Vercel Blob: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async getUrl(path: string): Promise<string> {
    try {
      const metadata = await head(path, { token: this.token })
      return metadata.url
    }
    catch (error) {
      throw new Error(`Failed to get URL from Vercel Blob: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async list(prefix: string): Promise<string[]> {
    try {
      const result = await list({
        prefix,
        token: this.token,
        limit: 1000, // Vercel Blob default limit
      })

      return result.blobs.map(blob => blob.pathname)
    }
    catch (error) {
      throw new Error(`Failed to list files from Vercel Blob: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    try {
      // List all files with this prefix
      const result = await list({
        prefix,
        token: this.token,
        limit: 1000,
      })

      if (result.blobs.length === 0) {
        return 0
      }

      // Delete all files (Vercel Blob supports batch delete)
      const urls = result.blobs.map(blob => blob.url)
      await del(urls, { token: this.token })

      return result.blobs.length
    }
    catch (error) {
      throw new Error(`Failed to delete files by prefix from Vercel Blob: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Parse cache-control header to extract max-age in seconds
   * Example: "public, max-age=31536000" => 31536000
   */
  private parseCacheControl(cacheControl: string): number | undefined {
    const match = cacheControl.match(/max-age=(\d+)/)
    return match ? Number.parseInt(match[1], 10) : undefined
  }
}

/**
 * Create a Vercel Blob storage adapter instance
 */
export function createVercelBlobAdapter(token?: string): StorageAdapter {
  return new VercelBlobAdapter(token)
}
