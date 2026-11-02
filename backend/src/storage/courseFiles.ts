import { COURSE_FILES_BUCKET } from '../config/constants.js'
import { env } from '../config/env.js'
import { supabaseAdmin } from '../db/supabaseAdmin.js'
import { AppError } from '../errors/AppError.js'
import { logger } from '../logger.js'

export type SignedUrlResult = {
  url: string
  expiresAt: string
}

function expiresAtFromNow(ttlSeconds: number): string {
  return new Date(Date.now() + ttlSeconds * 1000).toISOString()
}

export async function uploadCourseFile(
  storagePath: string,
  data: Buffer,
  contentType: string,
): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(COURSE_FILES_BUCKET)
    .upload(storagePath, data, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    logger.error({ err: error, storagePath }, 'Course file upload failed')
    throw new AppError(
      502,
      'FILE_UPLOAD_FAILED',
      'We could not store that file. Try again.',
    )
  }
}

export async function removeCourseFile(storagePath: string): Promise<void> {
  await removeCourseFiles([storagePath])
}

export async function removeCourseFiles(
  storagePaths: string[],
): Promise<void> {
  if (storagePaths.length === 0) {
    return
  }

  const { error } = await supabaseAdmin.storage
    .from(COURSE_FILES_BUCKET)
    .remove(storagePaths)

  if (error) {
    logger.error({ err: error, storagePaths }, 'Course file removal failed')
    throw new AppError(
      502,
      'FILE_REMOVE_FAILED',
      'We could not clean up that file.',
    )
  }
}

export async function listCourseFilePaths(prefix: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin.storage
    .from(COURSE_FILES_BUCKET)
    .list(prefix, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    })

  if (error) {
    logger.error({ err: error, prefix }, 'Course file list failed')
    throw new AppError(
      502,
      'FILE_LIST_FAILED',
      'We could not load those files. Try again.',
    )
  }

  return (data ?? [])
    .filter((entry) => entry.id && entry.name)
    .map((entry) => `${prefix}/${entry.name}`)
}

export async function createSignedUrlForCourseFile(
  storagePath: string,
  downloadName?: string,
): Promise<SignedUrlResult> {
  const { data, error } = await supabaseAdmin.storage
    .from(COURSE_FILES_BUCKET)
    .createSignedUrl(
      storagePath,
      env.SIGNED_URL_TTL_SECONDS,
      downloadName ? { download: downloadName } : undefined,
    )

  if (error || !data) {
    logger.error({ err: error }, 'Signed file URL creation failed')
    throw new AppError(
      502,
      'SIGNED_URL_FAILED',
      'We could not prepare that file. Try again.',
    )
  }

  return {
    url: data.signedUrl,
    expiresAt: expiresAtFromNow(env.SIGNED_URL_TTL_SECONDS),
  }
}

export async function createSignedUrlsForCourseFiles(
  storagePaths: string[],
): Promise<Map<string, string>> {
  if (storagePaths.length === 0) {
    return new Map()
  }

  const { data, error } = await supabaseAdmin.storage
    .from(COURSE_FILES_BUCKET)
    .createSignedUrls(storagePaths, env.SIGNED_URL_TTL_SECONDS)

  if (error || !data) {
    logger.error({ err: error }, 'Batch signed file URL creation failed')
    throw new AppError(
      502,
      'SIGNED_URL_FAILED',
      'We could not prepare those files. Try again.',
    )
  }

  const urls = new Map<string, string>()

  for (const entry of data) {
    if (entry.path && entry.signedUrl && !entry.error) {
      urls.set(entry.path, entry.signedUrl)
    }
  }

  return urls
}
