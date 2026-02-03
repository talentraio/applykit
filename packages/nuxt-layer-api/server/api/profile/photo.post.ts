import { readFile } from 'node:fs/promises';
import { readFiles } from 'h3-formidable';
import { profileRepository } from '../../data/repositories';
import { getStorage } from '../../storage';

/**
 * POST /api/profile/photo
 *
 * Upload profile photo for human resume
 *
 * Request:
 * - Content-Type: multipart/form-data
 * - Fields:
 *   - file: File (JPEG or PNG)
 *
 * Response:
 * - { photoUrl: string } - URL of the uploaded photo
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  // Parse multipart form data
  const { files } = await readFiles(event);

  // Validate file upload
  const fileArray = files.file;
  if (!fileArray || fileArray.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No file uploaded'
    });
  }

  const file = fileArray[0];

  // Validate file type (only images)
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!file.mimetype || !allowedMimeTypes.includes(file.mimetype)) {
    throw createError({
      statusCode: 400,
      message: `Invalid file type: ${file.mimetype}. Only JPEG, PNG, and WebP images are supported.`
    });
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw createError({
      statusCode: 400,
      message: 'File too large. Maximum size is 5MB.'
    });
  }

  // Read file buffer
  const buffer = await readFile(file.filepath);

  // Get file extension from mimetype
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };
  const ext = extMap[file.mimetype] || 'jpg';

  // Upload to storage
  const storage = getStorage();
  const storagePath = `photos/${userId}/profile.${ext}`;

  try {
    // Delete old photo if exists (might have different extension)
    const existingFiles = await storage.list(`photos/${userId}/`);
    for (const existingFile of existingFiles) {
      await storage.delete(existingFile);
    }

    // Upload new photo
    const photoUrl = await storage.put(storagePath, buffer, {
      contentType: file.mimetype,
      cacheControl: 'public, max-age=31536000' // Cache for 1 year
    });

    // Update profile with new photo URL
    await profileRepository.update(userId, { photoUrl });

    return { photoUrl: resolveStorageUrl(photoUrl) ?? photoUrl };
  } catch (error) {
    console.error('Failed to upload photo:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to upload photo'
    });
  }
});
