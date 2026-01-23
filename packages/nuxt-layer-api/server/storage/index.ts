import type { StorageAdapter, StorageConfig } from './types'
import process from 'node:process'
import { createLocalAdapter } from './local'
import { createVercelBlobAdapter } from './vercel-blob'

/**
 * Storage Factory
 *
 * Creates storage adapter based on environment configuration
 * - Production: Vercel Blob Storage
 * - Development: Local filesystem
 */

let _storageInstance: StorageAdapter | null = null

/**
 * Get storage adapter instance (singleton)
 */
export function getStorage(): StorageAdapter {
  if (_storageInstance) {
    return _storageInstance
  }

  _storageInstance = createStorage()
  return _storageInstance
}

/**
 * Create storage adapter based on environment
 */
export function createStorage(config?: StorageConfig): StorageAdapter {
  // Allow explicit configuration
  if (config) {
    return createStorageFromConfig(config)
  }

  // Auto-detect based on environment
  const isDevelopment = process.env.NODE_ENV === 'development'
  const hasVercelToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN)

  // Use local storage in development unless Vercel token is explicitly provided
  if (isDevelopment && !hasVercelToken) {
    return createLocalAdapter()
  }

  // Use Vercel Blob in production or when token is provided
  return createVercelBlobAdapter()
}

/**
 * Create storage adapter from explicit configuration
 */
function createStorageFromConfig(config: StorageConfig): StorageAdapter {
  switch (config.type) {
    case 'vercel-blob': {
      const token = config.options?.token as string | undefined
      return createVercelBlobAdapter(token)
    }
    case 'local': {
      const baseDir = config.options?.baseDir as string | undefined
      return createLocalAdapter(baseDir)
    }
    default:
      throw new Error(`Unknown storage type: ${config.type}`)
  }
}

/**
 * Reset storage instance (useful for testing)
 */
export function resetStorage(): void {
  _storageInstance = null
}

// Re-export types
export type { PutOptions, StorageAdapter, StorageConfig } from './types'
