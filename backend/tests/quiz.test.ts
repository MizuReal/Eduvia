import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { signTestToken } from '../src/test/authToken.js'

const { mocks, toQuizFileMock, toQuizMock } = vi.hoisted(() => {
  const toQuizFileMock = (row: {
    id: string
    original_name: string
    mime_type: string
    size_bytes: number
    file_class: 'image' | 'document'
    width: number | null
    height: number | null
    status: string
    preview_html: string | null
  }) => ({
    id: row.id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    fileClass: row.file_class,
    width: row.width,
    height: row.height,
    status: row.status,
    previewHtml: row.preview_html,
  })

  const mocks = {
    findTopicForInstructor: vi.fn(),
    findQuizByTopic: vi.fn(),
    findQuizForInstructor: vi.fn(),
    getQuizById: vi.fn(),
    insertQuiz: vi.fn(),
    listQuizQuestions: vi.fn(),
    saveQuizRecord: vi.fn(),
    publishQuizRecord: vi.fn(),
    findFileForQuiz: vi.fn(),
    replaceQuizPaperRecord: vi.fn(),
    removeQuizPaperRecord: vi.fn(),
    softDeleteQuizRecord: vi.fn(),
    findProfileById: vi.fn(),
    validateUploadedFile: vi.fn(),
    convertDocxToPreview: vi.fn(),
    assertStorageQuota: vi.fn(),
    uploadCourseFile: vi.fn(),
    removeCourseFile: vi.fn(),
  }

  const toQuizMock = (
    row: Record<string, unknown>,
    fileRow: Record<string, unknown> | null,
    questionRows: Record<string, unknown>[],
  ) => ({
    id: row.id,
    courseId: row.course_id,
    topicId: row.topic_id,
    mode: row.mode,
    title: row.title,
    instructions: row.instructions,
    passingScore: row.passing_score,
    status: row.status,
    version: row.version,
    file: fileRow ? toQuizFileMock(fileRow as never) : null,
    questions: questionRows.map((question) => ({
      id: question.id,
      orderIndex: question.order_index,
      prompt: question.prompt,
      optionA: question.option_a,
      optionB: question.option_b,
      optionC: question.option_c,
      optionD: question.option_d,
      correctOption: question.correct_option,
      explanation: question.explanation,
      points: question.points,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })

  return { mocks, toQuizFileMock, toQuizMock }
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
  findCourseIdByJoinCode: vi.fn(),
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

vi.mock('../src/db/quizzes.js', () => ({
  findFileForQuiz: mocks.findFileForQuiz,
  findQuizByTopic: mocks.findQuizByTopic,
  findQuizForInstructor: mocks.findQuizForInstructor,
  getQuizById: mocks.getQuizById,
  insertQuiz: mocks.insertQuiz,
  listQuizQuestions: mocks.listQuizQuestions,
  publishQuizRecord: mocks.publishQuizRecord,
  removeQuizPaperRecord: mocks.removeQuizPaperRecord,
  replaceQuizPaperRecord: mocks.replaceQuizPaperRecord,
  saveQuizRecord: mocks.saveQuizRecord,
  softDeleteQuizRecord: mocks.softDeleteQuizRecord,
  toQuiz: toQuizMock,
  toQuizFile: toQuizFileMock,
}))

vi.mock('../src/storage/courseFiles.js', () => ({
  createSignedUrlForCourseFile: vi.fn(),
  createSignedUrlsForCourseFiles: vi.fn(),
  listCourseFilePaths: vi.fn(),
  removeCourseFile: mocks.removeCourseFile,
  removeCourseFiles: vi.fn(),
  uploadCourseFile: mocks.uploadCourseFile,
}))

vi.mock('../src/services/uploadService.js', () => ({
  validateUploadedFile: mocks.validateUploadedFile,
}))

vi.mock('../src/services/docxPreviewService.js', () => ({
  convertDocxToPreview: mocks.convertDocxToPreview,
}))

vi.mock('../src/services/storageQuotaService.js', () => ({
  assertStorageQuota: mocks.assertStorageQuota,
}))

const app = createApp()

const courseId = 'c7c39a20-96a2-4c7e-9d29-37b60a8d9ae8'
const topicId = '11111111-1111-4111-8111-111111111111'
const quizId = '22222222-2222-4222-8222-222222222222'
const timestamp = '2026-11-02T00:00:00.000Z'
const correctOptions = ['A', 'B', 'C', 'D'] as const

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

const nativeQuiz = {
  id: quizId,
  course_id: courseId,
  topic_id: topicId,
  mode: 'native' as const,
  title: 'HTML quiz',
  instructions: '',
  passing_score: 75,
  status: 'draft' as const,
  version: 1,
  file_id: null,
  deleted_at: null,
  created_at: timestamp,
  updated_at: timestamp,
}

const documentQuiz = {
  ...nativeQuiz,
  mode: 'document' as const,
  title: 'Uploaded quiz',
  file_id: '33333333-3333-4333-8333-333333333333',
}

const paperFile = {
  id: '33333333-3333-4333-8333-333333333333',
  course_id: courseId,
  topic_id: topicId,
  uploaded_by: 'user-1',
  bucket: 'course-files',
  storage_path: `courses/${courseId}/paper.pdf`,
  original_name: 'paper.pdf',
  mime_type: 'application/pdf',
  size_bytes: 1024,
  checksum_sha256: 'a'.repeat(64),
  file_class: 'document' as const,
  width: null,
  height: null,
  status: 'ready' as const,
  content_id: null,
  preview_html: null,
  deleted_at: null,
  created_at: timestamp,
  updated_at: timestamp,
}

function questionRow(index: number, mode: 'native' | 'document') {
  return {
    id: `44444444-4444-4444-8444-44444444444${index % 10}`,
    quiz_id: quizId,
    order_index: index,
    prompt: mode === 'native' ? `Question ${index + 1}` : null,
    option_a: mode === 'native' ? 'Option A' : null,
    option_b: mode === 'native' ? 'Option B' : null,
    option_c: mode === 'native' ? 'Option C' : null,
    option_d: mode === 'native' ? 'Option D' : null,
    correct_option: correctOptions[index % 4],
    explanation: null,
    points: 1,
    deleted_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  }
}

const tenQuestions = Array.from({ length: 10 }, (_, index) =>
  questionRow(index, 'native'),
)

describe('quiz API', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
    mocks.findProfileById.mockResolvedValue(profile)
    mocks.findTopicForInstructor.mockResolvedValue(topic)
    mocks.findQuizByTopic.mockResolvedValue(null)
    mocks.findQuizForInstructor.mockResolvedValue(nativeQuiz)
    mocks.getQuizById.mockResolvedValue(nativeQuiz)
    mocks.insertQuiz.mockResolvedValue(nativeQuiz)
    mocks.listQuizQuestions.mockResolvedValue(tenQuestions)
    mocks.saveQuizRecord.mockResolvedValue(undefined)
    mocks.publishQuizRecord.mockResolvedValue({
      ...nativeQuiz,
      status: 'published',
      version: 2,
    })
    mocks.findFileForQuiz.mockResolvedValue(null)
    mocks.removeQuizPaperRecord.mockResolvedValue(undefined)
    mocks.softDeleteQuizRecord.mockResolvedValue(undefined)
    mocks.validateUploadedFile.mockResolvedValue({
      buffer: Buffer.from('%PDF-1.4'),
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      checksumSha256: 'a'.repeat(64),
      fileClass: 'document',
      width: null,
      height: null,
    })
    mocks.convertDocxToPreview.mockResolvedValue('<p>Converted paper</p>')
    mocks.assertStorageQuota.mockResolvedValue(undefined)
    mocks.uploadCourseFile.mockResolvedValue(undefined)
    mocks.removeCourseFile.mockResolvedValue(undefined)
    mocks.replaceQuizPaperRecord.mockResolvedValue(paperFile.id)
  })

  it('requires authentication', async () => {
    const response = await request(app).get(`/api/topics/${topicId}/quiz`)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('AUTH_REQUIRED')
  })

  it('rejects student accounts', async () => {
    mocks.findProfileById.mockResolvedValue(studentProfile)

    const response = await request(app)
      .get(`/api/topics/${topicId}/quiz`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(403)
  })

  it('returns an empty quiz workspace when no quiz exists', async () => {
    const response = await request(app)
      .get(`/api/topics/${topicId}/quiz`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(200)
    expect(response.body.data.quiz).toBeNull()
    expect(response.body.data.topic.id).toBe(topicId)
  })

  it('creates a native quiz once and returns the existing quiz afterwards', async () => {
    const first = await request(app)
      .put(`/api/topics/${topicId}/quiz`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({ mode: 'native' })

    expect(first.status).toBe(200)
    expect(mocks.insertQuiz).toHaveBeenCalledWith(courseId, topicId, 'native')
    expect(first.body.data.mode).toBe('native')

    mocks.findQuizByTopic.mockResolvedValue(nativeQuiz)
    const second = await request(app)
      .put(`/api/topics/${topicId}/quiz`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({ mode: 'native' })

    expect(second.status).toBe(200)
    expect(second.body.data.id).toBe(quizId)
    expect(mocks.insertQuiz).toHaveBeenCalledTimes(1)
  })

  it('rejects changing the mode of an existing quiz', async () => {
    mocks.findQuizByTopic.mockResolvedValue(nativeQuiz)

    const response = await request(app)
      .put(`/api/topics/${topicId}/quiz`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({ mode: 'document' })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('QUIZ_MODE_LOCKED')
  })

  it('saves native questions in bulk', async () => {
    const questions = Array.from({ length: 10 }, (_, index) => ({
      prompt: `Question ${index + 1}`,
      optionA: 'A',
      optionB: 'B',
      optionC: 'C',
      optionD: 'D',
      correctOption: 'A',
      explanation: '',
    }))

    const response = await request(app)
      .put(`/api/quizzes/${quizId}`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({
        title: 'HTML quiz',
        instructions: 'Choose one answer.',
        passingScore: 75,
        questions,
      })

    expect(response.status).toBe(200)
    expect(mocks.saveQuizRecord).toHaveBeenCalledWith(
      quizId,
      'HTML quiz',
      'Choose one answer.',
      75,
      expect.arrayContaining([
        expect.objectContaining({
          prompt: 'Question 1',
          correctOption: 'A',
        }),
      ]),
    )
  })

  it('rejects a native quiz payload with an answer key', async () => {
    const response = await request(app)
      .put(`/api/quizzes/${quizId}`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({
        title: 'HTML quiz',
        instructions: '',
        passingScore: 75,
        answers: ['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B'],
      })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('QUIZ_MODE_MISMATCH')
  })

  it('saves a document answer key', async () => {
    mocks.findQuizForInstructor.mockResolvedValue(documentQuiz)
    mocks.getQuizById.mockResolvedValue(documentQuiz)

    const response = await request(app)
      .put(`/api/quizzes/${quizId}`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({
        title: 'Uploaded quiz',
        instructions: '',
        passingScore: 75,
        answers: ['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B'],
      })

    expect(response.status).toBe(200)
    expect(mocks.saveQuizRecord).toHaveBeenCalledWith(
      quizId,
      'Uploaded quiz',
      '',
      75,
      expect.arrayContaining([
        expect.objectContaining({
          prompt: null,
          correctOption: 'A',
        }),
      ]),
    )
  })

  it('publishes a complete native quiz', async () => {
    const response = await request(app)
      .post(`/api/quizzes/${quizId}/publish`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(200)
    expect(mocks.publishQuizRecord).toHaveBeenCalledWith(quizId, 'user-1')
    expect(response.body.data.status).toBe('published')
  })

  it('rejects publishing with fewer than 10 questions', async () => {
    mocks.listQuizQuestions.mockResolvedValue(
      tenQuestions.slice(0, 9),
    )

    const response = await request(app)
      .post(`/api/quizzes/${quizId}/publish`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('QUIZ_NOT_READY')
  })

  it('rejects publishing a document quiz without a paper', async () => {
    mocks.findQuizForInstructor.mockResolvedValue(documentQuiz)
    mocks.findFileForQuiz.mockResolvedValue(null)

    const response = await request(app)
      .post(`/api/quizzes/${quizId}/publish`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('QUIZ_NOT_READY')
  })

  it('grades a preview attempt and computes pass/fail', async () => {
    const answers = tenQuestions.map((question) => question.correct_option)

    const response = await request(app)
      .post(`/api/quizzes/${quizId}/preview-grade`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({ answers })

    expect(response.status).toBe(200)
    expect(response.body.data.score).toBe(10)
    expect(response.body.data.percentage).toBe(100)
    expect(response.body.data.passed).toBe(true)
    expect(response.body.data.results).toHaveLength(10)
  })

  it('grades a partial attempt', async () => {
    const answers = tenQuestions.map((question, index) =>
      index < 5 ? question.correct_option : 'A',
    )

    const response = await request(app)
      .post(`/api/quizzes/${quizId}/preview-grade`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({ answers })

    expect(response.status).toBe(200)
    expect(response.body.data.score).toBeGreaterThanOrEqual(5)
    expect(response.body.data.percentage).toBeGreaterThanOrEqual(50)
    expect(response.body.data.results).toHaveLength(10)
  })

  it('rejects an answer count that does not match the quiz', async () => {
    const response = await request(app)
      .post(`/api/quizzes/${quizId}/preview-grade`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({ answers: ['A', 'B'] })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('QUIZ_ANSWER_COUNT_MISMATCH')
  })

  it('deletes a quiz', async () => {
    const response = await request(app)
      .delete(`/api/quizzes/${quizId}`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(200)
    expect(mocks.softDeleteQuizRecord).toHaveBeenCalledWith(quizId, 'user-1')
  })

  it('uploads a PDF quiz paper', async () => {
    mocks.findQuizForInstructor.mockResolvedValue(documentQuiz)
    mocks.getQuizById.mockResolvedValue(documentQuiz)
    mocks.findFileForQuiz.mockResolvedValue(paperFile)

    const response = await request(app)
      .post(`/api/quizzes/${quizId}/paper`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .attach('file', Buffer.from('%PDF-1.4'), 'paper.pdf')

    expect(response.status).toBe(200)
    expect(mocks.validateUploadedFile).toHaveBeenCalledWith(
      expect.objectContaining({ originalname: 'paper.pdf' }),
      'quiz-paper',
    )
    expect(mocks.replaceQuizPaperRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        quizId,
        courseId,
        topicId,
        mimeType: 'application/pdf',
        previewHtml: null,
      }),
    )
    expect(response.body.data.file.id).toBe(paperFile.id)
  })

  it('converts DOCX quiz papers to a sanitized preview', async () => {
    mocks.findQuizForInstructor.mockResolvedValue(documentQuiz)
    mocks.getQuizById.mockResolvedValue(documentQuiz)
    mocks.findFileForQuiz.mockResolvedValue({
      ...paperFile,
      mime_type:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      original_name: 'paper.docx',
      preview_html: '<p>Converted paper</p>',
    })
    mocks.validateUploadedFile.mockResolvedValue({
      buffer: Buffer.from('docx'),
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sizeBytes: 1024,
      checksumSha256: 'a'.repeat(64),
      fileClass: 'document',
      width: null,
      height: null,
    })

    const response = await request(app)
      .post(`/api/quizzes/${quizId}/paper`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .attach('file', Buffer.from('docx'), 'paper.docx')

    expect(response.status).toBe(200)
    expect(mocks.convertDocxToPreview).toHaveBeenCalled()
    expect(mocks.replaceQuizPaperRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        previewHtml: '<p>Converted paper</p>',
      }),
    )
    expect(response.body.data.file.previewHtml).toBe('<p>Converted paper</p>')
  })

  it('rejects a quiz paper on a native quiz', async () => {
    const response = await request(app)
      .post(`/api/quizzes/${quizId}/paper`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .attach('file', Buffer.from('%PDF-1.4'), 'paper.pdf')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('QUIZ_MODE_MISMATCH')
  })

  it('removes a document quiz paper', async () => {
    mocks.findQuizForInstructor.mockResolvedValue(documentQuiz)
    mocks.getQuizById.mockResolvedValue(documentQuiz)
    mocks.findFileForQuiz.mockResolvedValue(paperFile)
    mocks.removeQuizPaperRecord.mockResolvedValue(undefined)

    const response = await request(app)
      .delete(`/api/quizzes/${quizId}/paper`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(200)
    expect(mocks.removeQuizPaperRecord).toHaveBeenCalledWith(quizId, 'user-1')
  })
})
