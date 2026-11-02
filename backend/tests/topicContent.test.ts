import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { signTestToken } from '../src/test/authToken.js'

const { mocks, toTopicFileMock } = vi.hoisted(() => {
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
    findContentById: vi.fn(),
    findContentByTopicAndKind: vi.fn(),
    findContentForInstructor: vi.fn(),
    findTopicForInstructor: vi.fn(),
    insertContent: vi.fn(),
    listContentForTopic: vi.fn(),
    listFilesForContent: vi.fn(),
    findFilesByIds: vi.fn(),
    softDeleteContentRecord: vi.fn(),
    updateContentRecord: vi.fn(),
    updatePresentationRecord: vi.fn(),
    upsertPresentationRecord: vi.fn(),
    findProfileById: vi.fn(),
    createSignedUrlsForCourseFiles: vi.fn(),
  }

  return { mocks, toTopicFileMock }
})

vi.mock('../src/db/courseOutline.js', () => ({
  findDeletedLessonForInstructor: vi.fn(),
  findDeletedTopicForInstructor: vi.fn(),
  findLessonForInstructor: vi.fn(),
  findTopicById: vi.fn(),
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
  findContentById: mocks.findContentById,
  findContentByTopicAndKind: mocks.findContentByTopicAndKind,
  findContentForInstructor: mocks.findContentForInstructor,
  insertContent: mocks.insertContent,
  listContentForTopic: mocks.listContentForTopic,
  softDeleteContentRecord: mocks.softDeleteContentRecord,
  toTopicFile: toTopicFileMock,
  updateContentRecord: mocks.updateContentRecord,
  updatePresentationRecord: mocks.updatePresentationRecord,
  upsertPresentationRecord: mocks.upsertPresentationRecord,
}))

vi.mock('../src/db/files.js', () => ({
  findFileForInstructor: vi.fn(),
  findFilesByIds: mocks.findFilesByIds,
  insertFile: vi.fn(),
  listFilesForContent: mocks.listFilesForContent,
  sumActiveFileBytesForUser: vi.fn(),
}))

vi.mock('../src/storage/courseFiles.js', () => ({
  createSignedUrlForCourseFile: vi.fn(),
  createSignedUrlsForCourseFiles: mocks.createSignedUrlsForCourseFiles,
  listCourseFilePaths: vi.fn(),
  removeCourseFile: vi.fn(),
  removeCourseFiles: vi.fn(),
  uploadCourseFile: vi.fn(),
}))

vi.mock('../src/services/uploadService.js', () => ({
  validateUploadedFile: vi.fn(),
}))

const app = createApp()

const courseId = 'c7c39a20-96a2-4c7e-9d29-37b60a8d9ae8'
const topicId = '11111111-1111-4111-8111-111111111111'
const docId = '22222222-2222-4222-8222-222222222222'
const slidesId = '33333333-3333-4333-8333-333333333333'
const uploadId = '44444444-4444-4444-8444-444444444444'
const fileId = '55555555-5555-4555-8555-555555555555'
const imageFileId = '66666666-6666-4666-8666-666666666666'
const slideId = '77777777-7777-4777-8777-777777777777'
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

const studentProfile = { ...profile, username: 'student_one', role: 'student' }

const topic = {
  id: topicId,
  course_id: courseId,
  title: 'HTML and CSS',
  order_index: 0,
  created_at: timestamp,
  updated_at: timestamp,
}

const docRow = {
  id: docId,
  course_id: courseId,
  topic_id: topicId,
  kind: 'doc' as const,
  title: 'HTML notes',
  content: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
  },
  file_id: null,
  summary: null,
  order_index: 0,
  slide_count: null,
  deleted_at: null,
  created_at: timestamp,
  updated_at: timestamp,
}

const slidesRow = {
  ...docRow,
  id: slidesId,
  kind: 'slides' as const,
  title: 'Week 1',
  content: {
    version: 1,
    slides: [
      {
        id: slideId,
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
      },
    ],
  },
  slide_count: 1,
}

const uploadRow = {
  ...docRow,
  id: uploadId,
  kind: 'presentation' as const,
  title: 'Uploaded lecture',
  content: {},
  file_id: fileId,
  summary: 'A presentation summary that is long enough to be valid.',
  slide_count: null,
}

const uploadFile = {
  id: fileId,
  course_id: courseId,
  topic_id: topicId,
  uploaded_by: 'user-1',
  bucket: 'course-files',
  storage_path: `courses/${courseId}/${fileId}/lecture.pptx`,
  original_name: 'lecture.pptx',
  mime_type:
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  size_bytes: 2048,
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

const imageFileRow = {
  ...uploadFile,
  id: imageFileId,
  storage_path: `courses/${courseId}/${imageFileId}/diagram.png`,
  original_name: 'diagram.png',
  mime_type: 'image/png',
  file_class: 'image' as const,
  width: 640,
  height: 480,
  content_id: docId,
}

describe('topic content API', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
    mocks.findProfileById.mockResolvedValue(profile)
    mocks.findTopicForInstructor.mockResolvedValue(topic)
    mocks.findContentForInstructor.mockResolvedValue(docRow)
    mocks.findContentByTopicAndKind.mockResolvedValue(null)
    mocks.findContentById.mockResolvedValue(docRow)
    mocks.listContentForTopic.mockResolvedValue([slidesRow, docRow, uploadRow])
    mocks.listFilesForContent.mockResolvedValue([])
    mocks.findFilesByIds.mockResolvedValue([uploadFile])
    mocks.insertContent.mockResolvedValue(docRow)
    mocks.updateContentRecord.mockResolvedValue(undefined)
    mocks.softDeleteContentRecord.mockResolvedValue(undefined)
    mocks.updatePresentationRecord.mockResolvedValue(uploadRow)
    mocks.upsertPresentationRecord.mockResolvedValue({
      contentId: uploadId,
      fileId,
    })
    mocks.createSignedUrlsForCourseFiles.mockResolvedValue(new Map())
  })

  it('requires authentication', async () => {
    const response = await request(app).get(`/api/topics/${topicId}/content`)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('AUTH_REQUIRED')
  })

  it('rejects student accounts', async () => {
    mocks.findProfileById.mockResolvedValue(studentProfile)

    const response = await request(app)
      .get(`/api/topics/${topicId}/content`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })

  it('returns the three singleton workspace items', async () => {
    const response = await request(app)
      .get(`/api/topics/${topicId}/content`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(200)
    expect(response.body.data.topic).toEqual({
      id: topicId,
      title: 'HTML and CSS',
      courseId,
    })
    expect(response.body.data.slides.kind).toBe('slides')
    expect(response.body.data.doc.kind).toBe('doc')
    expect(response.body.data.upload.file.originalName).toBe('lecture.pptx')
    expect(response.body.data.items).toBeUndefined()
  })

  it('creates blank slides when none exist', async () => {
    mocks.insertContent.mockImplementation(
      (
        _courseId: string,
        _topicId: string,
        kind: string,
        title: string,
        content: unknown,
        orderIndex: number,
      ) => ({
        ...slidesRow,
        kind,
        title,
        content,
        order_index: orderIndex,
      }),
    )

    const response = await request(app)
      .put(`/api/topics/${topicId}/content/slides`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({})

    expect(response.status).toBe(200)
    expect(mocks.insertContent).toHaveBeenCalledWith(
      courseId,
      topicId,
      'slides',
      'Untitled slides',
      expect.any(Object),
      0,
    )
    const inserted = mocks.insertContent.mock.calls[0]?.[4] as {
      slides: unknown[]
    }
    expect(inserted.slides).toHaveLength(1)
    expect(response.body.data.kind).toBe('slides')
  })

  it('returns existing content instead of creating a duplicate', async () => {
    mocks.findContentByTopicAndKind.mockResolvedValue(slidesRow)

    const response = await request(app)
      .put(`/api/topics/${topicId}/content/slides`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({})

    expect(response.status).toBe(200)
    expect(response.body.data.id).toBe(slidesId)
    expect(mocks.insertContent).not.toHaveBeenCalled()
  })

  it('creates a blank document when none exists', async () => {
    mocks.insertContent.mockImplementation(
      (
        _courseId: string,
        _topicId: string,
        kind: string,
        title: string,
        content: unknown,
        orderIndex: number,
      ) => ({
        ...docRow,
        kind,
        title,
        content,
        order_index: orderIndex,
      }),
    )

    const response = await request(app)
      .put(`/api/topics/${topicId}/content/doc`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({})

    expect(response.status).toBe(200)
    expect(mocks.insertContent).toHaveBeenCalledWith(
      courseId,
      topicId,
      'doc',
      'Untitled document',
      { type: 'doc', content: [{ type: 'paragraph' }] },
      0,
    )
  })

  it('returns 404 for content the instructor does not own', async () => {
    mocks.findContentForInstructor.mockResolvedValue(null)

    const response = await request(app)
      .get(`/api/content/${docId}`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('CONTENT_NOT_FOUND')
  })

  it('updates a document and returns signed asset URLs', async () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'courseImage',
          attrs: { fileId: imageFileId, alt: 'Entity diagram' },
        },
      ],
    }
    mocks.listFilesForContent.mockResolvedValue([imageFileRow])
    mocks.createSignedUrlsForCourseFiles.mockResolvedValue(
      new Map([[imageFileRow.storage_path, 'https://signed.test/diagram']]),
    )
    mocks.findContentById.mockResolvedValue({ ...docRow, content })

    const response = await request(app)
      .patch(`/api/content/${docId}`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({ title: 'Updated notes', content })

    expect(response.status).toBe(200)
    expect(mocks.updateContentRecord).toHaveBeenCalledWith(
      docId,
      'Updated notes',
      content,
      [imageFileId],
    )
    expect(response.body.data.assets[0].url).toBe(
      'https://signed.test/diagram',
    )
  })

  it('rejects unsupported Tiptap nodes', async () => {
    const response = await request(app)
      .patch(`/api/content/${docId}`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({
        content: {
          type: 'doc',
          content: [{ type: 'script', content: [] }],
        },
      })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_CONTENT')
    expect(mocks.updateContentRecord).not.toHaveBeenCalled()
  })

  it('rejects file references from another content item', async () => {
    const content = {
      type: 'doc',
      content: [{ type: 'courseFile', attrs: { fileId: imageFileId } }],
    }
    mocks.listFilesForContent.mockResolvedValue([])

    const response = await request(app)
      .patch(`/api/content/${docId}`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({ content })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_CONTENT')
    expect(mocks.updateContentRecord).not.toHaveBeenCalled()
  })

  it('rejects a document summary', async () => {
    const response = await request(app)
      .patch(`/api/content/${docId}`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({ summary: 'This summary is long enough for validation.' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('CONTENT_KIND_MISMATCH')
  })

  it('soft-deletes content', async () => {
    const response = await request(app)
      .delete(`/api/content/${docId}`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(200)
    expect(mocks.softDeleteContentRecord).toHaveBeenCalledWith(docId, 'user-1')
  })
})
