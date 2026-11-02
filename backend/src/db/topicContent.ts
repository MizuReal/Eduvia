import { AppError } from '../errors/AppError.js'
import { logger } from '../logger.js'
import type { FileRow, TopicContentRow } from './database.types.js'
import { findCourseForInstructor } from './courses.js'
import { supabaseAdmin } from './supabaseAdmin.js'

const CONTENT_COLUMNS =
  'id, course_id, topic_id, kind, title, content, file_id, summary, order_index, slide_count, deleted_at, created_at, updated_at'
const CONTENT_PRESENCE_COLUMNS = 'topic_id, kind'
const TOPIC_SLIDE_SOURCE_COLUMNS = 'course_id, kind, slide_count, file_id'

export type ContentPresenceRow = {
  topic_id: string
  kind: TopicContentRow['kind']
}

export type TopicSlideSourceRow = {
  course_id: string
  kind: TopicContentRow['kind']
  slide_count: number | null
  file_id: string | null
}

export type TopicContentSelectRow = Pick<
  TopicContentRow,
  | 'id'
  | 'course_id'
  | 'topic_id'
  | 'kind'
  | 'title'
  | 'content'
  | 'file_id'
  | 'summary'
  | 'order_index'
  | 'slide_count'
  | 'deleted_at'
  | 'created_at'
  | 'updated_at'
>

export type UpsertPresentationRecordInput = {
  courseId: string
  topicId: string
  uploadedBy: string
  bucket: string
  storagePath: string
  originalName: string
  mimeType: string
  sizeBytes: number
  checksumSha256: string
  title: string
  summary: string
  actorId: string
}

export async function listContentForTopic(
  topicId: string,
): Promise<TopicContentSelectRow[]> {
  const { data, error } = await supabaseAdmin
    .from('topic_content_items')
    .select(CONTENT_COLUMNS)
    .eq('topic_id', topicId)
    .is('deleted_at', null)
    .order('kind', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    logger.error({ err: error, topicId }, 'Topic content list failed')
    throw new AppError(
      503,
      'CONTENT_LOAD_FAILED',
      'We could not load this topic content. Try again.',
    )
  }

  return data ?? []
}

export async function listContentPresenceForCourse(
  courseId: string,
): Promise<ContentPresenceRow[]> {
  const { data, error } = await supabaseAdmin
    .from('topic_content_items')
    .select(CONTENT_PRESENCE_COLUMNS)
    .eq('course_id', courseId)
    .is('deleted_at', null)

  if (error) {
    logger.error(
      { err: error, courseId },
      'Course content presence load failed',
    )
    throw new AppError(
      503,
      'CONTENT_LOAD_FAILED',
      'We could not load this subject content. Try again.',
    )
  }

  return data ?? []
}

export async function listTopicSlideSources(
  topicId: string,
): Promise<TopicSlideSourceRow[]> {
  const { data, error } = await supabaseAdmin
    .from('topic_content_items')
    .select(TOPIC_SLIDE_SOURCE_COLUMNS)
    .eq('topic_id', topicId)
    .in('kind', ['slides', 'presentation'])
    .is('deleted_at', null)

  if (error) {
    logger.error({ err: error, topicId }, 'Topic slide source load failed')
    throw new AppError(
      503,
      'CONTENT_LOAD_FAILED',
      'We could not load this topic content. Try again.',
    )
  }

  return data ?? []
}

export async function findContentForInstructor(
  contentId: string,
  instructorId: string,
): Promise<TopicContentSelectRow | null> {
  const content = await findContentById(contentId)

  if (!content) {
    return null
  }

  const course = await findCourseForInstructor(content.course_id, instructorId)

  return course ? content : null
}

export async function findContentById(
  contentId: string,
): Promise<TopicContentSelectRow | null> {
  const { data, error } = await supabaseAdmin
    .from('topic_content_items')
    .select(CONTENT_COLUMNS)
    .eq('id', contentId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, contentId }, 'Content lookup failed')
    throw new AppError(
      503,
      'CONTENT_LOAD_FAILED',
      'We could not load this content. Try again.',
    )
  }

  return data ?? null
}

export async function insertContent(
  courseId: string,
  topicId: string,
  kind: 'doc' | 'slides',
  title: string,
  content: unknown,
  orderIndex: number,
): Promise<TopicContentSelectRow> {
  const { data, error } = await supabaseAdmin
    .from('topic_content_items')
    .insert({
      course_id: courseId,
      topic_id: topicId,
      kind,
      title,
      content,
      order_index: orderIndex,
    })
    .select(CONTENT_COLUMNS)
    .single()

  if (error || !data) {
    logger.error({ err: error, topicId, kind }, 'Content creation failed')
    throw new AppError(
      500,
      'CONTENT_CREATE_FAILED',
      'We could not create this content. Try again.',
    )
  }

  return data
}

export async function updatePresentationRecord(
  contentId: string,
  title: string,
  summary: string,
): Promise<TopicContentSelectRow> {
  const { data, error } = await supabaseAdmin
    .from('topic_content_items')
    .update({ title, summary })
    .eq('id', contentId)
    .eq('kind', 'presentation')
    .is('deleted_at', null)
    .select(CONTENT_COLUMNS)
    .single()

  if (error || !data) {
    logger.error({ err: error, contentId }, 'Presentation update failed')
    throw new AppError(
      500,
      'CONTENT_UPDATE_FAILED',
      'We could not update this presentation. Try again.',
    )
  }

  return data
}

export async function findContentByTopicAndKind(
  topicId: string,
  kind: 'slides' | 'doc' | 'presentation',
): Promise<TopicContentSelectRow | null> {
  const { data, error } = await supabaseAdmin
    .from('topic_content_items')
    .select(CONTENT_COLUMNS)
    .eq('topic_id', topicId)
    .eq('kind', kind)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, topicId, kind }, 'Topic content lookup failed')
    throw new AppError(
      503,
      'CONTENT_LOAD_FAILED',
      'We could not load this content. Try again.',
    )
  }

  return data ?? null
}

export async function upsertPresentationRecord(
  input: UpsertPresentationRecordInput,
): Promise<{ contentId: string; fileId: string }> {
  const { data, error } = await supabaseAdmin.rpc('upsert_topic_presentation', {
    target_course_id: input.courseId,
    target_topic_id: input.topicId,
    target_uploaded_by: input.uploadedBy,
    target_bucket: input.bucket,
    target_storage_path: input.storagePath,
    target_original_name: input.originalName,
    target_mime_type: input.mimeType,
    target_size_bytes: input.sizeBytes,
    target_checksum_sha256: input.checksumSha256,
    target_title: input.title,
    target_summary: input.summary,
    target_actor_id: input.actorId,
  })

  if (error || !data) {
    logger.error(
      { err: error, topicId: input.topicId },
      'Presentation upsert failed',
    )
    throw new AppError(
      500,
      'PRESENTATION_CREATE_FAILED',
      'We could not save this presentation. Try again.',
    )
  }

  return data
}

export async function updateContentRecord(
  contentId: string,
  title: string,
  content: unknown,
  referencedFileIds: string[],
): Promise<void> {
  const { error } = await supabaseAdmin.rpc('update_topic_content', {
    target_content_id: contentId,
    new_title: title,
    new_content: content,
    referenced_file_ids: referencedFileIds,
  })

  if (error) {
    logger.error({ err: error, contentId }, 'Content update failed')
    throw new AppError(
      500,
      'CONTENT_UPDATE_FAILED',
      'We could not update this content. Try again.',
    )
  }
}

export async function softDeleteContentRecord(
  contentId: string,
  actorId: string,
): Promise<void> {
  const { error } = await supabaseAdmin.rpc('soft_delete_topic_content', {
    target_content_id: contentId,
    target_actor_id: actorId,
  })

  if (error) {
    logger.error({ err: error, contentId }, 'Content delete failed')
    throw new AppError(
      500,
      'CONTENT_DELETE_FAILED',
      'We could not delete this content. Try again.',
    )
  }
}

export function toTopicFile(row: FileRow): {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  fileClass: 'image' | 'document'
  width: number | null
  height: number | null
  status: FileRow['status']
} {
  return {
    id: row.id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    fileClass: row.file_class,
    width: row.width,
    height: row.height,
    status: row.status,
  }
}
