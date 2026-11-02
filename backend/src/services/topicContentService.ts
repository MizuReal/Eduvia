import { randomUUID } from 'node:crypto'
import { parse } from 'node:path'
import {
  CONTENT_MAX_ASSETS,
  COURSE_FILES_BUCKET,
  PRESENTATION_PREVIEW_MIME_TYPE,
  SLIDES_DOCUMENT_VERSION,
} from '../config/constants.js'
import { env } from '../config/env.js'
import {
  findFilesByIds,
  insertFile,
  listFilesForContent,
} from '../db/files.js'
import {
  findCourseEnrollmentPreview,
  findStudentEnrollment,
} from '../db/enrollments.js'
import { findTopicById, findTopicForInstructor } from '../db/courseOutline.js'
import {
  findContentById,
  findContentByTopicAndKind,
  findContentForInstructor,
  insertContent,
  listContentForTopic,
  softDeleteContentRecord,
  toTopicFile,
  updateContentRecord,
  updatePresentationRecord,
  upsertPresentationRecord,
} from '../db/topicContent.js'
import type { FileSelectRow } from '../db/files.js'
import type { TopicContentSelectRow } from '../db/topicContent.js'
import { AppError } from '../errors/AppError.js'
import { logger } from '../logger.js'
import {
  extractAssetReferences,
  validateContentForKind,
} from '../schemas/topicContent.js'
import type {
  ContentKind,
  PresentationUploadInput,
  UpdateContentInput,
} from '../schemas/topicContent.js'
import {
  createSignedUrlForCourseFile,
  createSignedUrlsForCourseFiles,
  listCourseFilePaths,
  removeCourseFile,
  removeCourseFiles,
  uploadCourseFile,
} from '../storage/courseFiles.js'
import type { AuthenticatedUser } from '../types/auth.js'
import type {
  DocContentItem,
  PresentationContentItem,
  PresentationPreview,
  SlidesContentItem,
  SlidesDocument,
  StudentPresentationContentItem,
  StudentTopicContent,
  TiptapDoc,
  TopicAsset,
  TopicContentItem,
  TopicContentSummary,
  TopicFile,
  TopicFileWithUrl,
  TopicWorkspace,
} from '../types/topicContent.js'
import {
  buildPresentationPreviewPath,
  buildStoragePath,
  presentationPreviewPrefix,
  removeTempUpload,
  sanitizeOriginalFilename,
} from '../utils/files.js'
import {
  renderPresentationPreviews,
  type PresentationPreviewPage,
} from './presentationPreviewService.js'
import { signFileForDelivery } from './fileService.js'
import { validateUploadedFile } from './uploadService.js'
import type { UploadPolicy } from './uploadService.js'
import { assertStorageQuota } from './storageQuotaService.js'

const EMPTY_DOCUMENT: TiptapDoc = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
}

function createEmptySlides(): SlidesDocument {
  return {
    version: SLIDES_DOCUMENT_VERSION,
    slides: [
      {
        id: randomUUID(),
        content: {
          type: 'doc',
          content: [
            { type: 'heading', attrs: { level: 1 } },
            { type: 'paragraph' },
          ],
        },
      },
    ],
  }
}

function toSummary(
  row: TopicContentSelectRow,
  file: TopicFile | null,
): TopicContentSummary {
  return {
    id: row.id,
    courseId: row.course_id,
    topicId: row.topic_id,
    kind: row.kind,
    title: row.title,
    orderIndex: row.order_index,
    slideCount: row.slide_count,
    summary: row.summary,
    file,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

function derivePresentationTitle(originalName: string): string {
  const base = parse(originalName).name
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)

  return base.length >= 2 ? base : 'Presentation'
}

function requiredTitle(title: string | undefined, fallback: string): string {
  return title ?? fallback
}

function signedUrlExpiry(): string {
  return new Date(Date.now() + env.SIGNED_URL_TTL_SECONDS * 1000).toISOString()
}

async function buildAssets(row: TopicContentSelectRow): Promise<TopicAsset[]> {
  if (row.kind === 'presentation') {
    return []
  }

  const references = extractAssetReferences(row.kind, row.content)
  const requiredClassById = new Map<string, 'image' | 'document'>()

  for (const reference of references) {
    requiredClassById.set(
      reference.fileId,
      reference.nodeType === 'courseImage' ? 'image' : 'document',
    )
  }

  if (requiredClassById.size === 0) {
    return []
  }

  const files = await listFilesForContent(row.id)
  const filesById = new Map(files.map((file) => [file.id, file]))
  const usableFiles: FileSelectRow[] = []

  for (const [fileId, requiredClass] of requiredClassById) {
    const file = filesById.get(fileId)

    if (
      file &&
      !file.deleted_at &&
      file.status === 'ready' &&
      file.file_class === requiredClass
    ) {
      usableFiles.push(file)
    }
  }

  let urls = new Map<string, string>()

  try {
    urls = await createSignedUrlsForCourseFiles(
      usableFiles.map((file) => file.storage_path),
    )
  } catch (error) {
    logger.warn({ err: error, contentId: row.id }, 'Content asset URLs failed')
  }

  const expiresAt = signedUrlExpiry()

  return usableFiles.map((file) => ({
    ...toTopicFile(file),
    url: urls.get(file.storage_path) ?? null,
    expiresAt,
  }))
}

async function buildContentItem(
  row: TopicContentSelectRow,
  fileRow: FileSelectRow | null,
): Promise<TopicContentItem> {
  if (row.kind === 'presentation') {
    if (!fileRow) {
      throw new AppError(
        500,
        'CONTENT_LOAD_FAILED',
        'We could not load this presentation. Try again.',
      )
    }

    const summary: PresentationContentItem = {
      ...toSummary(row, toTopicFile(fileRow)),
      kind: 'presentation',
      content: {},
      summary: row.summary ?? '',
      file: toTopicFile(fileRow),
      assets: [],
    }

    return summary
  }

  const assets = await buildAssets(row)

  if (row.kind === 'slides') {
    const item: SlidesContentItem = {
      ...toSummary(row, null),
      kind: 'slides',
      content: row.content as SlidesDocument,
      summary: null,
      file: null,
      assets,
    }

    return item
  }

  const item: DocContentItem = {
    ...toSummary(row, null),
    kind: 'doc',
    content: row.content as TiptapDoc,
    summary: null,
    file: null,
    assets,
  }

  return item
}

async function loadPresentationFile(
  fileId: string | null,
): Promise<FileSelectRow | null> {
  if (!fileId) {
    return null
  }

  const files = await findFilesByIds([fileId])

  return files[0] ?? null
}

function validateReferences(
  row: TopicContentSelectRow,
  content: unknown,
  files: FileSelectRow[],
): string[] {
  const references = extractAssetReferences(
    row.kind === 'slides' ? 'slides' : 'doc',
    content,
  )
  const referencesById = new Map<string, Set<'courseImage' | 'courseFile'>>()

  for (const reference of references) {
    const types = referencesById.get(reference.fileId) ?? new Set()
    types.add(reference.nodeType)
    referencesById.set(reference.fileId, types)
  }

  if (referencesById.size > CONTENT_MAX_ASSETS) {
    throw new AppError(
      400,
      'INVALID_CONTENT',
      'This content references too many files.',
      [
        {
          path: 'content',
          message: `Use no more than ${CONTENT_MAX_ASSETS} embedded files.`,
        },
      ],
    )
  }

  const filesById = new Map(files.map((file) => [file.id, file]))

  for (const [fileId, nodeTypes] of referencesById) {
    const file = filesById.get(fileId)

    if (
      !file ||
      file.status !== 'ready' ||
      file.topic_id !== row.topic_id ||
      file.course_id !== row.course_id
    ) {
      throw new AppError(
        400,
        'INVALID_CONTENT',
        'This content references a file that is not available.',
        [{ path: 'content', message: 'Remove the unavailable file and try again.' }],
      )
    }

    if (nodeTypes.has('courseImage') && nodeTypes.has('courseFile')) {
      throw new AppError(
        400,
        'INVALID_CONTENT',
        'A file cannot be both an image and an attachment.',
        [{ path: 'content', message: 'Use a file in only one way.' }],
      )
    }

    if (nodeTypes.has('courseImage') && file.file_class !== 'image') {
      throw new AppError(
        400,
        'INVALID_CONTENT',
        'This content uses a document as an image.',
        [{ path: 'content', message: 'Insert an image instead.' }],
      )
    }

    if (nodeTypes.has('courseFile') && file.file_class !== 'document') {
      throw new AppError(
        400,
        'INVALID_CONTENT',
        'This content uses an image as an attachment.',
        [{ path: 'content', message: 'Attach a document instead.' }],
      )
    }
  }

  return [...referencesById.keys()]
}

async function storeUploadedFile(input: {
  user: AuthenticatedUser
  courseId: string
  topicId: string
  contentId: string | null
  file: Express.Multer.File
  policy: UploadPolicy
}): Promise<{
  fileRow: FileSelectRow
  storagePath: string
}> {
  const validated = await validateUploadedFile(input.file, input.policy)

  await assertStorageQuota(input.user.id, validated.sizeBytes)

  const fileId = randomUUID()
  const originalName = sanitizeOriginalFilename(input.file.originalname)
  const storagePath = buildStoragePath(input.courseId, fileId, originalName)

  await uploadCourseFile(storagePath, validated.buffer, validated.mimeType)

  try {
    const fileRow = await insertFile({
      courseId: input.courseId,
      topicId: input.topicId,
      uploadedBy: input.user.id,
      bucket: COURSE_FILES_BUCKET,
      storagePath,
      originalName,
      mimeType: validated.mimeType,
      sizeBytes: validated.sizeBytes,
      checksumSha256: validated.checksumSha256,
      fileClass: validated.fileClass,
      width: validated.width,
      height: validated.height,
      contentId: input.contentId,
    })

    return { fileRow, storagePath }
  } catch (error) {
    try {
      await removeCourseFile(storagePath)
    } catch (cleanupError) {
      logger.error(
        { err: cleanupError, storagePath },
        'Orphaned upload cleanup failed',
      )
    }

    throw error
  }
}

export async function getTopicWorkspace(
  user: AuthenticatedUser,
  topicId: string,
): Promise<TopicWorkspace> {
  const topic = await findTopicForInstructor(topicId, user.id)

  if (!topic) {
    throw new AppError(404, 'TOPIC_NOT_FOUND', 'Topic not found.')
  }

  const rows = await listContentForTopic(topicId)
  const slidesRow = rows.find((row) => row.kind === 'slides')
  const docRow = rows.find((row) => row.kind === 'doc')
  const uploadRow = rows.find((row) => row.kind === 'presentation')

  let slides: SlidesContentItem | null = null
  let doc: DocContentItem | null = null
  let upload: PresentationContentItem | null = null

  if (slidesRow) {
    slides = (await buildContentItem(slidesRow, null)) as SlidesContentItem
  }

  if (docRow) {
    doc = (await buildContentItem(docRow, null)) as DocContentItem
  }

  if (uploadRow) {
    const fileRow = await loadPresentationFile(uploadRow.file_id)
    upload = (await buildContentItem(
      uploadRow,
      fileRow,
    )) as PresentationContentItem
  }

  return {
    topic: {
      id: topic.id,
      title: topic.title,
      courseId: topic.course_id,
    },
    slides,
    doc,
    upload,
  }
}

async function buildStudentPresentation(
  row: TopicContentSelectRow,
): Promise<StudentPresentationContentItem | null> {
  const fileRow = await loadPresentationFile(row.file_id)

  if (!fileRow || fileRow.deleted_at || fileRow.status !== 'ready') {
    return null
  }

  const item = (await buildContentItem(
    row,
    fileRow,
  )) as PresentationContentItem
  const delivery = await signFileForDelivery(fileRow)
  let previewPaths: string[] = []
  let previewUrls = new Map<string, string>()

  try {
    previewPaths = await listCourseFilePaths(
      presentationPreviewPrefix(row.course_id, fileRow.id),
    )
    previewUrls = await createSignedUrlsForCourseFiles(previewPaths)
  } catch (error) {
    logger.warn(
      { err: error, fileId: fileRow.id },
      'Presentation preview URLs failed',
    )
  }

  const previewExpiresAt = new Date(
    Date.now() + env.SIGNED_URL_TTL_SECONDS * 1000,
  ).toISOString()
  const previews: PresentationPreview[] = previewPaths.flatMap(
    (path, index) => {
      const url = previewUrls.get(path)
      const pageNumber = Number(
        /^slide-(\d+)\.webp$/.exec(path.split('/').pop() ?? '')?.[1] ??
          index + 1,
      )

      return url ? [{ pageNumber, url, expiresAt: previewExpiresAt }] : []
    },
  )
  const file: TopicFileWithUrl = {
    ...item.file,
    url: delivery.url,
    expiresAt: delivery.expiresAt,
  }

  return {
    ...item,
    file,
    previews,
  }
}

export async function getStudentTopicContent(
  user: AuthenticatedUser,
  topicId: string,
): Promise<StudentTopicContent> {
  const topic = await findTopicById(topicId)

  if (!topic) {
    throw new AppError(404, 'TOPIC_NOT_FOUND', 'Topic not found.')
  }

  const course = await findCourseEnrollmentPreview(topic.course_id)
  const enrollment = await findStudentEnrollment(topic.course_id, user.id)

  if (!course || !enrollment || enrollment.status !== 'active') {
    throw new AppError(404, 'TOPIC_NOT_FOUND', 'Topic not found.')
  }

  const rows = await listContentForTopic(topicId)
  const slidesRow = rows.find((row) => row.kind === 'slides')
  const uploadRow = rows.find((row) => row.kind === 'presentation')

  let slides: SlidesContentItem | null = null
  let upload: StudentPresentationContentItem | null = null

  if (slidesRow) {
    slides = (await buildContentItem(slidesRow, null)) as SlidesContentItem
  }

  if (uploadRow) {
    upload = await buildStudentPresentation(uploadRow)
  }

  return {
    topic: {
      id: topic.id,
      title: topic.title,
      courseId: topic.course_id,
    },
    slides,
    upload,
  }
}

export async function getContent(
  user: AuthenticatedUser,
  contentId: string,
): Promise<TopicContentItem> {
  const row = await findContentForInstructor(contentId, user.id)

  if (!row) {
    throw new AppError(404, 'CONTENT_NOT_FOUND', 'Content not found.')
  }

  const fileRow =
    row.kind === 'presentation' ? await loadPresentationFile(row.file_id) : null

  return buildContentItem(row, fileRow)
}

export async function ensureContent(
  user: AuthenticatedUser,
  topicId: string,
  kind: ContentKind,
): Promise<TopicContentItem> {
  const topic = await findTopicForInstructor(topicId, user.id)

  if (!topic) {
    throw new AppError(404, 'TOPIC_NOT_FOUND', 'Topic not found.')
  }

  const existing = await findContentByTopicAndKind(topicId, kind)

  if (existing) {
    return buildContentItem(existing, null)
  }

  const content = kind === 'doc' ? EMPTY_DOCUMENT : createEmptySlides()
  const title = kind === 'doc' ? 'Untitled document' : 'Untitled slides'

  try {
    const row = await insertContent(
      topic.course_id,
      topicId,
      kind,
      title,
      content,
      0,
    )

    return buildContentItem(row, null)
  } catch (error) {
    const raced = await findContentByTopicAndKind(topicId, kind)

    if (raced) {
      return buildContentItem(raced, null)
    }

    throw error
  }
}

export async function updateContent(
  user: AuthenticatedUser,
  contentId: string,
  input: UpdateContentInput,
): Promise<TopicContentItem> {
  const row = await findContentForInstructor(contentId, user.id)

  if (!row) {
    throw new AppError(404, 'CONTENT_NOT_FOUND', 'Content not found.')
  }

  if (row.kind === 'presentation') {
    if (input.content !== undefined) {
      throw new AppError(
        400,
        'CONTENT_KIND_MISMATCH',
        'Presentation content is managed through the uploaded file.',
      )
    }

    const updated = await updatePresentationRecord(
      contentId,
      requiredTitle(input.title, row.title),
      input.summary ?? row.summary ?? '',
    )
    const fileRow = await loadPresentationFile(updated.file_id)

    return buildContentItem(updated, fileRow)
  }

  if (input.summary !== undefined) {
    throw new AppError(
      400,
      'CONTENT_KIND_MISMATCH',
      'Only presentations have a summary.',
    )
  }

  const content = input.content !== undefined ? input.content : row.content
  const details = validateContentForKind(row.kind, content)

  if (details.length > 0) {
    throw new AppError(
      400,
      'INVALID_CONTENT',
      'Please check the content and try again.',
      details,
    )
  }

  const files = await listFilesForContent(contentId)
  const referencedFileIds = validateReferences(row, content, files)

  await updateContentRecord(
    contentId,
    requiredTitle(input.title, row.title),
    content,
    referencedFileIds,
  )

  const updated = await findContentById(contentId)

  if (!updated) {
    throw new AppError(
      500,
      'CONTENT_UPDATE_FAILED',
      'We could not reload this content. Try again.',
    )
  }

  return buildContentItem(updated, null)
}

export async function deleteContent(
  user: AuthenticatedUser,
  contentId: string,
): Promise<void> {
  const row = await findContentForInstructor(contentId, user.id)

  if (!row) {
    throw new AppError(404, 'CONTENT_NOT_FOUND', 'Content not found.')
  }

  await softDeleteContentRecord(contentId, user.id)
}

async function uploadPresentationPreviewPages(
  courseId: string,
  fileId: string,
  pages: PresentationPreviewPage[],
): Promise<string[]> {
  const uploadedPaths: string[] = []

  try {
    for (const page of pages) {
      const storagePath = buildPresentationPreviewPath(
        courseId,
        fileId,
        page.pageNumber,
      )
      await uploadCourseFile(
        storagePath,
        page.buffer,
        PRESENTATION_PREVIEW_MIME_TYPE,
      )
      uploadedPaths.push(storagePath)
    }

    return uploadedPaths
  } catch (error) {
    try {
      await removeCourseFiles(uploadedPaths)
    } catch (cleanupError) {
      logger.error(
        { err: cleanupError, courseId, fileId },
        'Presentation preview cleanup failed',
      )
    }

    throw error
  }
}

export async function uploadPresentation(
  user: AuthenticatedUser,
  topicId: string,
  file: Express.Multer.File,
  input: PresentationUploadInput,
): Promise<TopicContentItem> {
  try {
    const topic = await findTopicForInstructor(topicId, user.id)

    if (!topic) {
      throw new AppError(404, 'TOPIC_NOT_FOUND', 'Topic not found.')
    }

    const validated = await validateUploadedFile(file, 'presentation')
    await assertStorageQuota(user.id, validated.sizeBytes)

    const previewPages = await renderPresentationPreviews(
      file,
      validated.mimeType,
    )

    const originalName = sanitizeOriginalFilename(file.originalname)
    const title = requiredTitle(input.title, derivePresentationTitle(originalName))
    const fileId = randomUUID()
    const storagePath = buildStoragePath(topic.course_id, fileId, originalName)

    await uploadCourseFile(storagePath, validated.buffer, validated.mimeType)

    let previewPaths: string[] = []

    try {
      previewPaths = await uploadPresentationPreviewPages(
        topic.course_id,
        fileId,
        previewPages,
      )
    } catch (error) {
      try {
        await removeCourseFile(storagePath)
      } catch (cleanupError) {
        logger.error(
          { err: cleanupError, storagePath },
          'Presentation storage cleanup failed',
        )
      }

      throw error
    }

    let stored: { contentId: string; fileId: string }

    try {
      stored = await upsertPresentationRecord({
        courseId: topic.course_id,
        topicId,
        uploadedBy: user.id,
        bucket: COURSE_FILES_BUCKET,
        storagePath,
        originalName,
        mimeType: validated.mimeType,
        sizeBytes: validated.sizeBytes,
        checksumSha256: validated.checksumSha256,
        title,
        summary: input.summary,
        actorId: user.id,
      })
    } catch (error) {
      try {
        await removeCourseFiles([storagePath, ...previewPaths])
      } catch (cleanupError) {
        logger.error(
          { err: cleanupError, storagePath, fileId },
          'Presentation storage cleanup failed',
        )
      }

      throw error
    }

    const row = await findContentById(stored.contentId)
    const fileRow = await loadPresentationFile(stored.fileId)

    if (!row) {
      throw new AppError(
        500,
        'PRESENTATION_CREATE_FAILED',
        'We could not load this presentation. Try again.',
      )
    }

    return buildContentItem(row, fileRow)
  } finally {
    await removeTempUpload(file.path)
  }
}

export async function uploadContentAsset(
  user: AuthenticatedUser,
  contentId: string,
  file: Express.Multer.File,
  kind: 'image' | 'file',
): Promise<TopicAsset> {
  try {
    const row = await findContentForInstructor(contentId, user.id)

    if (!row) {
      throw new AppError(404, 'CONTENT_NOT_FOUND', 'Content not found.')
    }

    if (row.kind === 'presentation') {
      throw new AppError(
        400,
        'CONTENT_KIND_MISMATCH',
        'Presentations cannot contain embedded files.',
      )
    }

    const stored = await storeUploadedFile({
      user,
      courseId: row.course_id,
      topicId: row.topic_id,
      contentId,
      file,
      policy: kind === 'image' ? 'image' : 'document',
    })

    let url: string | null = null

    try {
      const signed = await createSignedUrlForCourseFile(stored.storagePath)
      url = signed.url
    } catch (error) {
      logger.warn(
        { err: error, contentId },
        'Asset preview URL creation failed',
      )
    }

    return {
      ...toTopicFile(stored.fileRow),
      url,
      expiresAt: signedUrlExpiry(),
    }
  } finally {
    await removeTempUpload(file.path)
  }
}
