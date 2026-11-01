import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { AppError } from '../src/errors/AppError.js'
import { signTestToken } from '../src/test/authToken.js'

const { mocks, validateUploadedFileMock, toTopicFileMock } = vi.hoisted(() => {
  const toTopicFileMock = (row: {
    id: string
    original_name: string
    mime_type: string
    size_bytes: number
    file_class: 'image' | 'document'
    width: number | null
    height: number | null
    status: string
  }) => ({
    id: row.id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    fileClass: row.file_class,
    width: row.width,
    height: row.height,
    status: row.status,
  })

  const mocks = {
    upsertPresentationRecord: vi.fn(),
    createSignedUrlForCourseFile: vi.fn(),
    createSignedUrlsForCourseFiles: vi.fn(),
    findContentById: vi.fn(),
    findContentByTopicAndKind: vi.fn(),
    findContentForInstructor: vi.fn(),
    findFileForInstructor: vi.fn(),
    findFilesByIds: vi.fn(),
    findProfileById: vi.fn(),
    findTopicForInstructor: vi.fn(),
    insertFile: vi.fn(),
    listFilesForContent: vi.fn(),
    removeCourseFile: vi.fn(),
    sumActiveFileBytesForUser: vi.fn(),
    uploadCourseFile: vi.fn(),
  }

  return {
    mocks,
    validateUploadedFileMock: vi.fn(),
    toTopicFileMock,
  }
})

vi.mock('../src/db/courseOutline.js', () => ({
  findDeletedLessonForInstructor: vi.fn(),
  findDeletedTopicForInstructor: vi.fn(),
  findLessonForInstructor: vi.fn(),
  findTopicForCourse: vi.fn(),
  findTopicForInstructor: mocks.findTopicForInstructor,
  getCourseTrash: vi.fn(),
  getNextLessonOrderIndex: vi.fn(),
  getNextTopicOrderIndex: vi.fn(),
  insertLesson: vi.fn(),
  insertTopic: vi.fn(),
  listTopicsAndLessons: vi.fn(),
  reorderCourseTopics: vi.fn(),
  reorderTopicLessons: vi.fn(),
  restoreLesson: vi.fn(),
  restoreTopic: vi.fn(),
  softDeleteLesson: vi.fn(),
  softDeleteTopic: vi.fn(),
  updateLessonRecord: vi.fn(),
  updateTopicTitle: vi.fn(),
}))

vi.mock('../src/db/courses.js', () => ({
  findCourseForInstructor: vi.fn(),
  insertCourse: vi.fn(),
  listCourseCodesForScope: vi.fn(),
  listCoursesByInstructor: vi.fn(),
}))

vi.mock('../src/db/profiles.js', () => ({
  createProfile: vi.fn(),
  findProfileById: mocks.findProfileById,
  findProfileByUsername: vi.fn(),
}))

vi.mock('../src/db/topicContent.js', () => ({
  upsertPresentationRecord: mocks.upsertPresentationRecord,
  findContentById: mocks.findContentById,
  findContentByTopicAndKind: mocks.findContentByTopicAndKind,
  findContentForInstructor: mocks.findContentForInstructor,
  insertContent: vi.fn(),
  listContentForTopic: vi.fn(),
  softDeleteContentRecord: vi.fn(),
  toTopicFile: toTopicFileMock,
  updateContentRecord: vi.fn(),
  updatePresentationRecord: vi.fn(),
}))

vi.mock('../src/db/files.js', () => ({
  findFileForInstructor: mocks.findFileForInstructor,
  findFilesByIds: mocks.findFilesByIds,
  insertFile: mocks.insertFile,
  listFilesForContent: mocks.listFilesForContent,
  sumActiveFileBytesForUser: mocks.sumActiveFileBytesForUser,
}))

vi.mock('../src/storage/courseFiles.js', () => ({
  createSignedUrlForCourseFile: mocks.createSignedUrlForCourseFile,
  createSignedUrlsForCourseFiles: mocks.createSignedUrlsForCourseFiles,
  removeCourseFile: mocks.removeCourseFile,
  uploadCourseFile: mocks.uploadCourseFile,
}))

vi.mock('../src/services/uploadService.js', () => ({
  validateUploadedFile: validateUploadedFileMock,
}))

const app = createApp()

const courseId = 'c7c39a20-96a2-4c7e-9d29-37b60a8d9ae8'
const topicId = '11111111-1111-4111-8111-111111111111'
const contentId = '22222222-2222-4222-8222-222222222222'
const fileId = '33333333-3333-4333-8333-333333333333'
const timestamp = '2026-11-02T00:00:00.000Z'

const profile = {
  id: 'user-1',
  username: 'teacher_one',
  faculty: 'BSIT',
  role: 'instructor',
  tos_version: '1.0',
  tos_accepted_at: timestamp,
  deleted_at: null,
  created_at: timestamp,
  updated_at: timestamp,
}

const topic = {
  id: topicId,
  course_id: courseId,
  title: 'HTML and CSS',
  order_index: 0,
  created_at: timestamp,
  updated_at: timestamp,
}

const docRow = {
  id: contentId,
  course_id: courseId,
  topic_id: topicId,
  kind: 'doc' as const,
  title: 'HTML notes',
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  file_id: null,
  summary: null,
  order_index: 0,
  slide_count: null,
  deleted_at: null,
  created_at: timestamp,
  updated_at: timestamp,
}

const presentationRow = {
  ...docRow,
  id: '55555555-5555-4555-8555-555555555555',
  kind: 'presentation' as const,
  title: 'Week 1',
  content: {},
  file_id: fileId,
  summary: 'A presentation summary that is long enough to be valid.',
}

const presentationFile = {
  id: fileId,
  course_id: courseId,
  topic_id: topicId,
  uploaded_by: 'user-1',
  bucket: 'course-files',
  storage_path: `courses/${courseId}/${fileId}/week-1.pptx`,
  original_name: 'week-1.pptx',
  mime_type:
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  size_bytes: 1024,
  checksum_sha256: 'a'.repeat(64),
  file_class: 'document' as const,
  width: null,
  height: null,
  status: 'ready' as const,
  content_id: null,
  deleted_at: null,
  created_at: timestamp,
  updated_at: timestamp,
}

const validatedPptx = {
  buffer: Buffer.from('mock pptx'),
  mimeType:
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  sizeBytes: 9,
  checksumSha256: 'b'.repeat(64),
  fileClass: 'document' as const,
  width: null,
  height: null,
}

describe('content uploads', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
    validateUploadedFileMock.mockReset()
    mocks.findProfileById.mockResolvedValue(profile)
    mocks.findTopicForInstructor.mockResolvedValue(topic)
    mocks.uploadCourseFile.mockResolvedValue(undefined)
    mocks.removeCourseFile.mockResolvedValue(undefined)
    mocks.sumActiveFileBytesForUser.mockResolvedValue(0)
    mocks.upsertPresentationRecord.mockResolvedValue({
      contentId: presentationRow.id,
      fileId,
    })
    mocks.findContentById.mockResolvedValue(presentationRow)
    mocks.findFilesByIds.mockResolvedValue([presentationFile])
    mocks.createSignedUrlForCourseFile.mockResolvedValue({
      url: 'https://signed.test/file',
      expiresAt: timestamp,
    })
    mocks.createSignedUrlsForCourseFiles.mockResolvedValue(new Map())
    mocks.insertFile.mockResolvedValue({
      ...presentationFile,
      content_id: contentId,
      file_class: 'image',
      original_name: 'diagram.png',
      mime_type: 'image/png',
      status: 'ready',
    })
    validateUploadedFileMock.mockResolvedValue(validatedPptx)
  })

  it('requires an authenticated file upload', async () => {
    const response = await request(app)
      .post(`/api/topics/${topicId}/presentations`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .field('summary', 'A presentation summary that is long enough.')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('FILE_REQUIRED')
  })

  it('rejects unauthenticated presentation uploads', async () => {
    const response = await request(app)
      .post(`/api/topics/${topicId}/presentations`)
      .field('summary', 'A presentation summary that is long enough.')
      .attach('file', Buffer.from('mock pptx'), 'week-1.pptx')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('AUTH_REQUIRED')
  })

  it('uploads a presentation and creates the content record', async () => {
    const response = await request(app)
      .post(`/api/topics/${topicId}/presentations`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .field('title', 'Week 1')
      .field('summary', 'A presentation summary that is long enough.')
      .attach('file', Buffer.from('mock pptx'), 'week-1.pptx')

    expect(response.status).toBe(201)
    expect(mocks.uploadCourseFile).toHaveBeenCalled()
    expect(mocks.upsertPresentationRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId,
        topicId,
        uploadedBy: 'user-1',
        originalName: 'week-1.pptx',
        title: 'Week 1',
        summary: 'A presentation summary that is long enough.',
        actorId: 'user-1',
      }),
    )
    expect(response.body.data.kind).toBe('presentation')
    expect(response.body.data.file.originalName).toBe('week-1.pptx')
  })

  it('rejects an upload when the storage quota is full', async () => {
    mocks.sumActiveFileBytesForUser.mockResolvedValue(250 * 1024 * 1024)

    const response = await request(app)
      .post(`/api/topics/${topicId}/presentations`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .field('summary', 'A presentation summary that is long enough.')
      .attach('file', Buffer.from('mock pptx'), 'week-1.pptx')

    expect(response.status).toBe(413)
    expect(response.body.error.code).toBe('STORAGE_QUOTA_EXCEEDED')
    expect(mocks.uploadCourseFile).not.toHaveBeenCalled()
  })

  it('returns the validation error from the file validator', async () => {
    validateUploadedFileMock.mockRejectedValue(
      new AppError(415, 'FILE_TYPE_NOT_ALLOWED', 'That file type is not allowed.'),
    )

    const response = await request(app)
      .post(`/api/topics/${topicId}/presentations`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .field('summary', 'A presentation summary that is long enough.')
      .attach('file', Buffer.from('mock'), 'bad.exe')

    expect(response.status).toBe(415)
    expect(response.body.error.code).toBe('FILE_TYPE_NOT_ALLOWED')
  })

  it('uploads an embedded image asset', async () => {
    mocks.findContentForInstructor.mockResolvedValue(docRow)
    validateUploadedFileMock.mockResolvedValue({
      ...validatedPptx,
      mimeType: 'image/png',
      sizeBytes: 4,
      fileClass: 'image',
      width: 2,
      height: 2,
    })

    const response = await request(app)
      .post(`/api/content/${contentId}/assets`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .field('kind', 'image')
      .attach('file', Buffer.from('png'), 'diagram.png')

    expect(response.status).toBe(201)
    expect(mocks.insertFile).toHaveBeenCalledWith(
      expect.objectContaining({
        contentId,
        fileClass: 'image',
        width: 2,
        height: 2,
      }),
    )
    expect(response.body.data.url).toBe('https://signed.test/file')
  })

  it('rejects embedded assets on presentations', async () => {
    mocks.findContentForInstructor.mockResolvedValue(presentationRow)

    const response = await request(app)
      .post(`/api/content/${presentationRow.id}/assets`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .field('kind', 'image')
      .attach('file', Buffer.from('png'), 'diagram.png')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('CONTENT_KIND_MISMATCH')
  })

  it('returns a signed URL for an owned file', async () => {
    mocks.findFileForInstructor.mockResolvedValue(presentationFile)

    const response = await request(app)
      .get(`/api/files/${fileId}/url`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(200)
    expect(response.body.data.url).toBe('https://signed.test/file')
    expect(response.body.data.fileName).toBe('week-1.pptx')
    expect(response.body.data.storagePath).toBeUndefined()
  })

  it('returns 404 for a deleted file', async () => {
    mocks.findFileForInstructor.mockResolvedValue({
      ...presentationFile,
      deleted_at: timestamp,
    })

    const response = await request(app)
      .get(`/api/files/${fileId}/url`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('FILE_NOT_FOUND')
  })
})
