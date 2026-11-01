import { findFileForInstructor } from '../db/files.js'
import { AppError } from '../errors/AppError.js'
import { createSignedUrlForCourseFile } from '../storage/courseFiles.js'
import type { AuthenticatedUser } from '../types/auth.js'
import type { SignedFileUrl } from '../types/topicContent.js'

const INLINE_MIME_TYPES = new Set(['application/pdf'])

export async function getFileSignedUrl(
  user: AuthenticatedUser,
  fileId: string,
): Promise<SignedFileUrl> {
  const file = await findFileForInstructor(fileId, user.id)

  if (!file || file.deleted_at || file.status !== 'ready') {
    throw new AppError(404, 'FILE_NOT_FOUND', 'File not found.')
  }

  const shouldDownload =
    file.file_class === 'document' && !INLINE_MIME_TYPES.has(file.mime_type)

  const signed = await createSignedUrlForCourseFile(
    file.storage_path,
    shouldDownload ? file.original_name : undefined,
  )

  return {
    url: signed.url,
    expiresAt: signed.expiresAt,
    fileName: file.original_name,
    mimeType: file.mime_type,
    sizeBytes: file.size_bytes,
    fileClass: file.file_class,
    width: file.width,
    height: file.height,
  }
}
