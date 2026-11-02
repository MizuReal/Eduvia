import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { signTestToken } from '../src/test/authToken.js'

const { mocks } = vi.hoisted(() => {
  const mocks = {
    findProfileById: vi.fn(),
    findTopicById: vi.fn(),
    findTopicForInstructor: vi.fn(),
    findStudentEnrollment: vi.fn(),
    findCourseEnrollmentPreview: vi.fn(),
    listContentForTopic: vi.fn(),
    listContentForCourse: vi.fn(),
    listTopicsAndLessons: vi.fn(),
    listTopicProgressForCourse: vi.fn(),
    listAttemptsForStudentCourse: vi.fn(),
    listPublishedQuizzesForCourse: vi.fn(),
    countQuizQuestionsByQuizIds: vi.fn(),
    findLatestAttempt: vi.fn(),
    findFilesByIds: vi.fn(),
    findFileForInstructor: vi.fn(),
    createSignedUrlForCourseFile: vi.fn(),
    createSignedUrlsForCourseFiles: vi.fn(),
    listCourseFilePaths: vi.fn(),
    uploadCourseFile: vi.fn(),
    removeCourseFile: vi.fn(),
    removeCourseFiles: vi.fn(),
  }

  return { mocks }
})

vi.mock('../src/db/profiles.js', () => ({
  createProfile: vi.fn(),
  findProfileById: mocks.findProfileById,
  findProfileByUsername: vi.fn(),
}))

vi.mock('../src/db/courseOutline.js', () => ({
  findDeletedLessonForInstructor: vi.fn(),
  findDeletedTopicForInstructor: vi.fn(),
  findLessonForInstructor: vi.fn(),
  findTopicById: mocks.findTopicById,
  findTopicForCourse: vi.fn(),
  findTopicForInstructor: mocks.findTopicForInstructor,
  getCourseTrash: vi.fn(),
  getNextLessonOrderIndex: vi.fn(),
  getNextTopicOrderIndex: vi.fn(),
  insertLesson: vi.fn(),
  insertTopic: vi.fn(),
  listTopicsAndLessons: mocks.listTopicsAndLessons,
  reorderCourseTopics: vi.fn(),
  reorderTopicLessons: vi.fn(),
  restoreLesson: vi.fn(),
  restoreTopic: vi.fn(),
  softDeleteLesson: vi.fn(),
  softDeleteTopic: vi.fn(),
  updateLessonRecord: vi.fn(),
  updateTopicTitle: vi.fn(),
}))

vi.mock('../src/db/enrollments.js', () => ({
  findCourseEnrollmentPreview: mocks.findCourseEnrollmentPreview,
  findStudentEnrollment: mocks.findStudentEnrollment,
}))

vi.mock('../src/db/files.js', () => ({
  findFileForInstructor: mocks.findFileForInstructor,
  findFilesByIds: mocks.findFilesByIds,
  insertFile: vi.fn(),
  listFilesForContent: vi.fn(),
  sumActiveFileBytesForUser: vi.fn(),
}))

vi.mock('../src/db/topicContent.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/db/topicContent.js')>()

  return {
    ...actual,
    listContentForTopic: mocks.listContentForTopic,
    listContentForCourse: mocks.listContentForCourse,
  }
})

vi.mock('../src/db/learning.js', () => ({
  findTopicProgress: vi.fn(),
  listTopicProgressForCourse: mocks.listTopicProgressForCourse,
  recordTopicSlideProgress: vi.fn(),
  listAttemptsForStudentCourse: mocks.listAttemptsForStudentCourse,
  findLatestAttempt: mocks.findLatestAttempt,
  findInProgressAttempt: vi.fn(),
  findAttemptById: vi.fn(),
  listAttemptAnswers: vi.fn(),
  createQuizAttempt: vi.fn(),
  saveAttemptAnswers: vi.fn(),
  gradeAttempt: vi.fn(),
}))

vi.mock('../src/db/quizzes.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/db/quizzes.js')>()

  return {
    ...actual,
    listPublishedQuizzesForCourse: mocks.listPublishedQuizzesForCourse,
    countQuizQuestionsByQuizIds: mocks.countQuizQuestionsByQuizIds,
  }
})

vi.mock('../src/storage/courseFiles.js', () => ({
  createSignedUrlForCourseFile: mocks.createSignedUrlForCourseFile,
  createSignedUrlsForCourseFiles: mocks.createSignedUrlsForCourseFiles,
  listCourseFilePaths: mocks.listCourseFilePaths,
  removeCourseFile: mocks.removeCourseFile,
  removeCourseFiles: mocks.removeCourseFiles,
  uploadCourseFile: mocks.uploadCourseFile,
}))

const app = createApp()

const courseId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const topicId = '11111111-1111-4111-8111-111111111111'
const slidesId = '22222222-2222-4222-8222-222222222222'
const uploadId = '33333333-3333-4333-8333-333333333333'
const fileId = '44444444-4444-4444-8444-444444444444'
const timestamp = '2026-11-02T00:00:00.000Z'

const studentProfile = {
  id: 'student-1',
  username: 'student_one',
  faculty: 'BSIT',
  role: 'student',
  tos_version: '1.0',
  tos_accepted_at: timestamp,
  deleted_at: null,
  created_at: timestamp,
  updated_at: timestamp,
}

const instructorProfile = {
  ...studentProfile,
  id: 'teacher-1',
  username: 'teacher_one',
  role: 'instructor',
}

const topic = {
  id: topicId,
  course_id: courseId,
  title: 'HTML foundations',
  order_index: 0,
  created_at: timestamp,
  updated_at: timestamp,
}

const courseTopic = {
  id: topicId,
  title: 'HTML foundations',
  orderIndex: 0,
  lessons: [],
  createdAt: timestamp,
  updatedAt: timestamp,
}

const course = {
  id: courseId,
  name: 'Web Systems',
  code: 'WEB101',
  term: 'first_trimester' as const,
  yearLevel: 2 as const,
  enrollmentOpen: true,
  enrollmentMode: 'approval' as const,
  instructorUsername: 'teacher_one',
  createdAt: timestamp,
  updatedAt: timestamp,
}

const fileRow = {
  id: fileId,
  course_id: courseId,
  topic_id: topicId,
  uploaded_by: 'teacher-1',
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
  content_id: uploadId,
  preview_html: null,
  deleted_at: null,
  created_at: timestamp,
  updated_at: timestamp,
}

function contentRow(
  id: string,
  kind: 'slides' | 'doc' | 'presentation',
  title: string,
) {
  return {
    id,
    course_id: courseId,
    topic_id: topicId,
    kind,
    title,
    content:
      kind === 'slides'
        ? {
            version: 1,
            slides: [
              {
                id: '55555555-5555-4555-8555-555555555555',
                content: { type: 'doc', content: [{ type: 'paragraph' }] },
              },
            ],
          }
        : kind === 'doc'
          ? { type: 'doc', content: [{ type: 'paragraph' }] }
          : {},
    file_id: kind === 'presentation' ? fileId : null,
    summary:
      kind === 'presentation'
        ? 'A presentation summary that is long enough to be valid.'
        : null,
    order_index: 0,
    slide_count: kind === 'slides' ? 1 : null,
    deleted_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  }
}

describe('student topic content', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
    mocks.findProfileById.mockResolvedValue(studentProfile)
    mocks.findTopicById.mockResolvedValue(topic)
    mocks.findStudentEnrollment.mockResolvedValue({
      id: '66666666-6666-4666-8666-666666666666',
      courseId,
      studentId: 'student-1',
      status: 'active',
      decidedAt: timestamp,
      removedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    mocks.findCourseEnrollmentPreview.mockResolvedValue(course)
    mocks.listTopicsAndLessons.mockResolvedValue([courseTopic])
    mocks.listContentForCourse.mockResolvedValue([
      { topic_id: topicId, kind: 'presentation' },
      { topic_id: topicId, kind: 'slides' },
    ])
    mocks.listTopicProgressForCourse.mockResolvedValue([])
    mocks.listPublishedQuizzesForCourse.mockResolvedValue([])
    mocks.countQuizQuestionsByQuizIds.mockResolvedValue(new Map())
    mocks.listAttemptsForStudentCourse.mockResolvedValue([])
    mocks.findLatestAttempt.mockResolvedValue(null)
    mocks.listContentForTopic.mockResolvedValue([
      contentRow(slidesId, 'slides', 'Week 1 slides'),
      contentRow(uploadId, 'presentation', 'Week 1 presentation'),
      contentRow('77777777-7777-4777-8777-777777777777', 'doc', 'Week 1 doc'),
    ])
    mocks.findFilesByIds.mockResolvedValue([fileRow])
    mocks.listCourseFilePaths.mockResolvedValue([
      `courses/${courseId}/${fileId}/previews/slide-0001.webp`,
      `courses/${courseId}/${fileId}/previews/slide-0002.webp`,
    ])
    mocks.createSignedUrlsForCourseFiles.mockResolvedValue(
      new Map([
        [
          `courses/${courseId}/${fileId}/previews/slide-0001.webp`,
          'https://signed.test/slide-1',
        ],
        [
          `courses/${courseId}/${fileId}/previews/slide-0002.webp`,
          'https://signed.test/slide-2',
        ],
      ]),
    )
    mocks.createSignedUrlForCourseFile.mockResolvedValue({
      url: 'https://signed.test/original',
      expiresAt: timestamp,
    })
  })

  it('returns slides and uploaded slide previews to an enrolled student', async () => {
    const response = await request(app)
      .get(`/api/student/topics/${topicId}/content`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(200)
    expect(response.body.data.topic.title).toBe('HTML foundations')
    expect(response.body.data.slides.title).toBe('Week 1 slides')
    expect(response.body.data.upload.title).toBe('Week 1 presentation')
    expect(response.body.data.upload.previews).toHaveLength(2)
    expect(response.body.data.upload.previews[1].url).toBe(
      'https://signed.test/slide-2',
    )
    expect(response.body.data.doc).toBeUndefined()
  })

  it('hides the topic from a pending student', async () => {
    mocks.findStudentEnrollment.mockResolvedValue({
      id: '66666666-6666-4666-8666-666666666666',
      courseId,
      studentId: 'student-1',
      status: 'pending',
      decidedAt: null,
      removedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    const response = await request(app)
      .get(`/api/student/topics/${topicId}/content`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(404)
  })

  it('rejects instructors', async () => {
    mocks.findProfileById.mockResolvedValue(instructorProfile)

    const response = await request(app)
      .get(`/api/student/topics/${topicId}/content`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(403)
  })

  it('requires authentication', async () => {
    const response = await request(app).get(
      `/api/student/topics/${topicId}/content`,
    )

    expect(response.status).toBe(401)
  })
})
