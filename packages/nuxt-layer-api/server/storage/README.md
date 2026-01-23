# Storage Adapter

Abstract storage layer for file operations with pluggable backends.

## Overview

The storage adapter provides a unified interface for file storage operations across different backends:
- **Production**: Vercel Blob Storage
- **Development**: Local filesystem

## Architecture

```
server/storage/
├── types.ts          # StorageAdapter interface
├── vercel-blob.ts    # Vercel Blob implementation
├── local.ts          # Local filesystem implementation
└── index.ts          # Factory with auto-detection
```

## Usage

### Basic Operations

```typescript
import { getStorage } from '~/server/storage'

const storage = getStorage()

// Upload a file
const url = await storage.put('exports/user-123/resume.pdf', pdfBuffer, {
  contentType: 'application/pdf',
  cacheControl: 'public, max-age=31536000',
})

// Get a file
const buffer = await storage.get('exports/user-123/resume.pdf')

// Delete a file
const deleted = await storage.delete('exports/user-123/resume.pdf')

// Get public URL
const url = await storage.getUrl('exports/user-123/resume.pdf')

// List files by prefix
const files = await storage.list('exports/user-123/')

// Delete all files with prefix
const count = await storage.deleteByPrefix('exports/user-123/')
```

### Environment-Based Selection

The factory automatically selects the appropriate backend:

```typescript
// Development (no BLOB_READ_WRITE_TOKEN) → Local filesystem
// Production (BLOB_READ_WRITE_TOKEN set) → Vercel Blob
const storage = getStorage()
```

### Explicit Configuration

```typescript
import { createStorage } from '~/server/storage'

// Force Vercel Blob
const storage = createStorage({
  type: 'vercel-blob',
  options: { token: 'your-token' },
})

// Force local with custom directory
const storage = createStorage({
  type: 'local',
  options: { baseDir: '/custom/path' },
})
```

## Backends

### Vercel Blob Storage (Production)

- **Package**: `@vercel/blob`
- **Environment**: `BLOB_READ_WRITE_TOKEN`
- **Features**:
  - CDN-backed global distribution
  - Automatic HTTPS URLs
  - No file size limits (multipart uploads)
  - Built-in caching

**Configuration**:
```bash
# Auto-detected on Vercel
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

### Local Filesystem (Development)

- **Directory**: `.data/storage/` (default)
- **Base URL**: `http://localhost:3000/api/storage` (default)
- **Features**:
  - No external dependencies
  - Instant local development
  - Filesystem-backed

**Configuration**:
```bash
# Optional: Custom base directory
STORAGE_BASE_DIR=/custom/path

# Optional: Custom base URL
STORAGE_BASE_URL=http://localhost:3000/files
```

## Storage Adapter Interface

```typescript
interface StorageAdapter {
  // Upload a file
  put(path: string, data: Buffer | Blob, options?: PutOptions): Promise<string>

  // Retrieve a file
  get(path: string): Promise<Buffer | null>

  // Delete a file
  delete(path: string): Promise<boolean>

  // Get public URL
  getUrl(path: string): Promise<string>

  // List files by prefix
  list(prefix: string): Promise<string[]>

  // Delete files by prefix
  deleteByPrefix(prefix: string): Promise<number>
}

interface PutOptions {
  contentType?: string      // MIME type (e.g., 'application/pdf')
  cacheControl?: string     // Cache header (e.g., 'public, max-age=31536000')
  metadata?: Record<string, string>  // Custom metadata
}
```

## Path Conventions

Use consistent path patterns for organization:

```typescript
// Exports (PDF files)
exports/{userId}/{generationId}-{version}.pdf
// Example: exports/user-123/gen-456-ats.pdf

// Source files (uploaded resumes)
sources/{userId}/{resumeId}.{ext}
// Example: sources/user-123/resume-789.docx

// Temporary files
temp/{sessionId}/{filename}
// Example: temp/session-abc/upload.pdf
```

## Error Handling

All methods throw errors for unexpected failures, but return null/false for expected cases:

```typescript
// Returns null if file doesn't exist (expected)
const buffer = await storage.get('nonexistent.pdf')
// → null

// Returns false if file doesn't exist (expected)
const deleted = await storage.delete('nonexistent.pdf')
// → false

// Throws error for unexpected failures
try {
  await storage.put('file.pdf', buffer)
} catch (error) {
  console.error('Upload failed:', error)
}
```

## Integration with Services

### Export Service

```typescript
import { getStorage } from '~/server/storage'

export async function exportToPDF(generationId: string, version: 'ats' | 'human') {
  const storage = getStorage()
  const generation = await generationRepository.findById(generationId)

  // Generate PDF
  const pdfBuffer = await generatePDF(generation, version)

  // Upload to storage
  const path = `exports/${generation.userId}/${generationId}-${version}.pdf`
  const url = await storage.put(path, pdfBuffer, {
    contentType: 'application/pdf',
    cacheControl: 'public, max-age=2592000', // 30 days
  })

  return { url, cached: false }
}
```

### Cache Invalidation

```typescript
export async function invalidateExports(userId: string, generationId: string) {
  const storage = getStorage()

  // Delete all exports for this generation (both ATS and Human)
  const prefix = `exports/${userId}/${generationId}-`
  const count = await storage.deleteByPrefix(prefix)

  console.log(`Deleted ${count} export files`)
}
```

## Testing

For unit tests, you can mock the storage adapter:

```typescript
import { vi } from 'vitest'

const mockStorage = {
  put: vi.fn().mockResolvedValue('https://example.com/file.pdf'),
  get: vi.fn().mockResolvedValue(Buffer.from('mock')),
  delete: vi.fn().mockResolvedValue(true),
  getUrl: vi.fn().mockResolvedValue('https://example.com/file.pdf'),
  list: vi.fn().mockResolvedValue([]),
  deleteByPrefix: vi.fn().mockResolvedValue(0),
}
```

Or use the local adapter for integration tests:

```typescript
import { createStorage } from '~/server/storage'

const storage = createStorage({
  type: 'local',
  options: { baseDir: '/tmp/test-storage' },
})
```

## Performance Considerations

### Vercel Blob

- **Upload**: Async, returns immediately with URL
- **Download**: CDN-cached globally
- **Delete**: Batch operations supported
- **List**: Paginated (limit: 1000 per request)

### Local

- **Upload**: Synchronous filesystem write
- **Download**: Direct filesystem read
- **Delete**: Synchronous filesystem unlink
- **List**: Recursive directory scan

## Future Enhancements

Potential backend additions:
- AWS S3
- Google Cloud Storage
- Azure Blob Storage
- Cloudflare R2

To add a new backend:
1. Implement `StorageAdapter` interface
2. Add factory case in `createStorageFromConfig()`
3. Update environment detection logic

## Related

- **Export Service**: T115-T124 (uses storage for PDF exports)
- **Parse Service**: T072-T081 (uses storage for source files)
- **Cache Service**: TX030 (invalidation strategy uses storage)
