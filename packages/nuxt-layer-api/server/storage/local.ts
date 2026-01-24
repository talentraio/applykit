import type { PutOptions, StorageAdapter } from './types'
import { Buffer } from 'node:buffer'
import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'

/**
 * Local Filesystem Storage Adapter
 *
 * Development storage backend using local filesystem
 * Stores files in .data/storage/ by default
 */
export class LocalAdapter implements StorageAdapter {
  private baseDir: string
  private baseUrl: string

  constructor(baseDir?: string) {
    const runtimeConfig = useRuntimeConfig()
    const configuredBaseDir = runtimeConfig.storage?.baseDir

    // Default to .data/storage/ for local development
    this.baseDir = baseDir || configuredBaseDir || join(process.cwd(), '.data', 'storage')

    // Generate local URL (for dev server)
    // In a real app, you'd serve these files via a Nuxt API route
    this.baseUrl = runtimeConfig.storage?.baseUrl || 'http://localhost:3000/api/storage'
  }

  async put(path: string, data: Buffer | Blob, _options?: PutOptions): Promise<string> {
    try {
      const fullPath = join(this.baseDir, path)

      // Ensure directory exists
      await fs.mkdir(dirname(fullPath), { recursive: true })

      // Convert Blob to Buffer if needed
      const buffer = data instanceof Blob ? Buffer.from(await data.arrayBuffer()) : data

      // Write file
      await fs.writeFile(fullPath, buffer)

      // Return URL
      return this.pathToUrl(path)
    } catch (error) {
      throw new Error(
        `Failed to write file to local storage: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async get(path: string): Promise<Buffer | null> {
    try {
      const fullPath = join(this.baseDir, path)
      const buffer = await fs.readFile(fullPath)
      return buffer
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      throw new Error(
        `Failed to read file from local storage: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async delete(path: string): Promise<boolean> {
    try {
      const fullPath = join(this.baseDir, path)
      await fs.unlink(fullPath)
      return true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false
      }
      throw new Error(
        `Failed to delete file from local storage: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async getUrl(path: string): Promise<string> {
    // Check if file exists
    const fullPath = join(this.baseDir, path)
    try {
      await fs.access(fullPath)
      return this.pathToUrl(path)
    } catch {
      throw new Error(`File not found in local storage: ${path}`)
    }
  }

  async list(prefix: string): Promise<string[]> {
    try {
      const fullPath = join(this.baseDir, prefix)

      // Check if directory exists
      try {
        await fs.access(fullPath)
      } catch {
        return []
      }

      const files = await this.listRecursive(fullPath, prefix)
      return files
    } catch (error) {
      throw new Error(
        `Failed to list files from local storage: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    try {
      const files = await this.list(prefix)
      let count = 0

      for (const file of files) {
        const deleted = await this.delete(file)
        if (deleted) count++
      }

      return count
    } catch (error) {
      throw new Error(
        `Failed to delete files by prefix from local storage: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Recursively list all files in a directory
   */
  private async listRecursive(dir: string, prefix: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files: string[] = []

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      const relativePath = join(prefix, entry.name)

      if (entry.isDirectory()) {
        const subFiles = await this.listRecursive(fullPath, relativePath)
        files.push(...subFiles)
      } else {
        files.push(relativePath)
      }
    }

    return files
  }

  /**
   * Convert storage path to URL
   */
  private pathToUrl(path: string): string {
    // Encode path for URL
    const encodedPath = path
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/')
    return `${this.baseUrl}/${encodedPath}`
  }
}

/**
 * Create a local filesystem storage adapter instance
 */
export function createLocalAdapter(baseDir?: string): StorageAdapter {
  return new LocalAdapter(baseDir)
}
