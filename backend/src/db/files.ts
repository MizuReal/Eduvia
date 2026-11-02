import { AppError } from '../errors/AppError.js'
import { logger } from '../logger.js'
import type { FileRow } from './database.types.js'
import { findCourseForInstructor } from './courses.js'
import { supabaseAdmin } from './supabaseAdmin.js'

const FILE_COLUMNS =
  'id, course_id, topic_id, uploaded_by, bucket, storage_path, original_name, mime_type, size_bytes, checksum_sha256, file_class, width, height, status, content_id, preview_html, deleted_at, created_at, updated_at'

export type FileSelectRow = Pick<
  FileRow,
  | 'id'
  | 'course_id'
  | 'topic_id'
  | 'uploaded_by'
  | 'bucket'
  | 'storage_path'
  | 'original_name'
  | 'mime_type'
  | 'size_bytes'
  | 'checksum_sha256'
  | 'file_class'
  | 'width'
  | 'height'
  | 'status'
  | 'content_id'
  | 'preview_html'
  | 'deleted_at'
  | 'created_at'
  | 'updated_at'
>

export type FileInsertInput = {
  courseId: string
  topicId: string
  uploadedBy: string
  bucket: string
  storagePath: string
  originalName: string
  mimeType: string
  sizeBytes: number
  checksumSha256: string
  fileClass: 'image' | 'document'
  width: number | null
  height: number | null
  contentId: string | null
}

export async function insertFile(input: FileInsertInput): Promise<FileSelectRow> {
  const { data, error } = await supabaseAdmin
    .from('files')
    .insert({
      course_id: input.courseId,
      topic_id: input.topicId,
      uploaded_by: input.uploadedBy,
      bucket: input.bucket,
      storage_path: input.storagePath,
      original_name: input.originalName,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      checksum_sha256: input.checksumSha256,
      file_class: input.fileClass,
      width: input.width,
      height: input.height,
      content_id: input.contentId,
      status: 'ready',
    })
    .select(FILE_COLUMNS)
    .single()

  if (error || !data) {
    logger.error({ err: error, contentId: input.contentId }, 'File record creation failed')
    throw new AppError(
      500,
      'FILE_CREATE_FAILED',
      'We could not save the file. Try again.',
    )
  }

  return data
}

export async function findFileForInstructor(
  fileId: string,
  instructorId: string,
): Promise<FileSelectRow | null> {
  const { data, error } = await supabaseAdmin
    .from('files')
    .select(FILE_COLUMNS)
    .eq('id', fileId)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, fileId }, 'File lookup failed')
    throw new AppError(
      503,
      'FILE_LOOKUP_FAILED',
      'We could not load that file. Try again.',
    )
  }

  if (!data) {
    return null
  }

  const course = await findCourseForInstructor(data.course_id, instructorId)

  return course ? data : null
}

export async function listFilesForContent(
  contentId: string,
): Promise<FileSelectRow[]> {
  const { data, error } = await supabaseAdmin
    .from('files')
    .select(FILE_COLUMNS)
    .eq('content_id', contentId)

  if (error) {
    logger.error({ err: error, contentId }, 'Content file lookup failed')
    throw new AppError(
      503,
      'FILE_LOOKUP_FAILED',
      'We could not load the files for this content. Try again.',
    )
  }

  return data ?? []
}

export async function findFilesByIds(fileIds: string[]): Promise<FileSelectRow[]> {
  if (fileIds.length === 0) {
    return []
  }

  const { data, error } = await supabaseAdmin
    .from('files')
    .select(FILE_COLUMNS)
    .in('id', fileIds)

  if (error) {
    logger.error({ err: error, fileIdCount: fileIds.length }, 'File batch lookup failed')
    throw new AppError(
      503,
      'FILE_LOOKUP_FAILED',
      'We could not load those files. Try again.',
    )
  }

  return data ?? []
}

export async function sumActiveFileBytesForUser(
  uploadedBy: string,
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('files')
    .select('size_bytes')
    .eq('uploaded_by', uploadedBy)
    .is('deleted_at', null)

  if (error) {
    logger.error({ err: error, uploadedBy }, 'Storage quota lookup failed')
    throw new AppError(
      503,
      'STORAGE_QUOTA_LOOKUP_FAILED',
      'We could not check your storage quota. Try again.',
    )
  }

  return (data ?? []).reduce((total, row) => total + row.size_bytes, 0)
}