import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { signTestToken } from '../src/test/authToken.js'

const { mocks } = vi.hoisted(() => {
  const mocks = {
    findProfileById: vi.fn(),
    findCourseForInstructor: vi.fn(),
    findCourseIdByJoinCode: vi.fn(),
    listTopicsAndLessons: vi.fn(),
    requestEnrollmentRecord: vi.fn(),
    listEnrollmentsForStudent: vi.fn(),
    findStudentEnrollment: vi.fn(),
    findEnrollmentById: vi.fn(),
    findEnrollmentForInstructor: vi.fn(),
    listEnrollmentsForCourse: vi.fn(),
    listStudentsByIds: vi.fn(),
    updateEnrollmentStatus: vi.fn(),
    updateCourseEnrollmentSettings: vi.fn(),
    findCourseEnrollmentPreview: vi.fn(),
    listStudentEnrollmentCourses: vi.fn(),
    toCourseEnrollmentList: vi.fn(),
    listTopicProgressForCourse: vi.fn(),
    listAttemptSummariesForStudentCourse: vi.fn(),
    listContentPresenceForCourse: vi.fn(),
    listPublishedQuizzesForCourse: vi.fn(),
    countQuizQuestionsByQuizIds: vi.fn(),
  }

  return { mocks }
})

vi.mock('../src/db/profiles.js', () => ({
  createProfile: vi.fn(),
  findProfileById: mocks.findProfileById,
  findProfileByUsername: vi.fn(),
}))

vi.mock('../src/db/courses.js', () => ({
  COURSE_COLUMNS:
    'id, name, code, join_code, term, year_level, enrollment_open, enrollment_mode, created_at, updated_at',
  findCourseForInstructor: mocks.findCourseForInstructor,
  findCourseIdByJoinCode: mocks.findCourseIdByJoinCode,
  insertCourse: vi.fn(),
  listCourseCodesForScope: vi.fn(),
  listCoursesByInstructor: vi.fn(),
  toCourse: (row: Record<string, unknown>) => row,
}))

vi.mock('../src/db/courseOutline.js', () => ({
  findDeletedLessonForInstructor: vi.fn(),
  findDeletedTopicForInstructor: vi.fn(),
  findLessonForInstructor: vi.fn(),
  findTopicForCourse: vi.fn(),
  findTopicForInstructor: vi.fn(),
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

vi.mock('../src/db/enrollments.js', () => mocks)

vi.mock('../src/db/learning.js', () => ({
  findTopicProgress: vi.fn(),
  listTopicProgressForCourse: mocks.listTopicProgressForCourse,
  recordTopicSlideProgress: vi.fn(),
  listAttemptSummariesForStudentCourse: mocks.listAttemptSummariesForStudentCourse,
  findLatestAttempt: vi.fn(),
  findInProgressAttempt: vi.fn(),
  findAttemptById: vi.fn(),
  listAttemptAnswers: vi.fn(),
  createQuizAttempt: vi.fn(),
  saveAttemptAnswers: vi.fn(),
  gradeAttempt: vi.fn(),
}))

vi.mock('../src/db/topicContent.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/db/topicContent.js')>()

  return {
    ...actual,
    listContentPresenceForCourse: mocks.listContentPresenceForCourse,
  }
})

vi.mock('../src/db/quizzes.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/db/quizzes.js')>()

  return {
    ...actual,
    listPublishedQuizzesForCourse: mocks.listPublishedQuizzesForCourse,
    countQuizQuestionsByQuizIds: mocks.countQuizQuestionsByQuizIds,
  }
})

const app = createApp()

const courseId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const enrollmentId = '11111111-1111-4111-8111-111111111111'
const pendingId = '22222222-2222-4222-8222-222222222222'
const timestamp = '2026-11-02T00:00:00.000Z'

const instructorProfile = {
  id: 'teacher-1',
  username: 'teacher_one',
  faculty: 'BSIT',
  role: 'instructor',
  tos_version: '1.0',
  tos_accepted_at: timestamp,
  deleted_at: null,
  created_at: timestamp,
  updated_at: timestamp,
}

const studentProfile = {
  ...instructorProfile,
  id: 'student-1',
  username: 'student_one',
  role: 'student',
}

const course = {
  id: courseId,
  name: 'Web Systems',
  code: 'WEB101',
  joinCode: 'K7M2QX',
  term: 'first_trimester' as const,
  yearLevel: 2 as const,
  enrollmentOpen: true,
  enrollmentMode: 'approval' as const,
  createdAt: timestamp,
  updatedAt: timestamp,
}

const enrollmentCourse = {
  ...course,
  instructorUsername: 'teacher_one',
}

const activeEnrollment = {
  id: enrollmentId,
  courseId,
  studentId: 'student-1',
  status: 'active' as const,
  decidedAt: timestamp,
  removedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
}

const pendingEnrollment = {
  ...activeEnrollment,
  id: pendingId,
  studentId: 'student-2',
  status: 'pending' as const,
  decidedAt: null,
}

const topics = [
  {
    id: '33333333-3333-4333-8333-333333333333',
    title: 'HTML foundations',
    orderIndex: 0,
    lessons: [
      {
        id: '44444444-4444-4444-8444-444444444444',
        topicId: '33333333-3333-4333-8333-333333333333',
        title: 'Semantic HTML',
        orderIndex: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  },
]

describe('enrollment API', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
    mocks.findProfileById.mockResolvedValue(studentProfile)
    mocks.findCourseForInstructor.mockResolvedValue(course)
    mocks.findCourseIdByJoinCode.mockResolvedValue(null)
    mocks.listTopicsAndLessons.mockResolvedValue(topics)
    mocks.listContentPresenceForCourse.mockResolvedValue([
      { topic_id: topics[0]?.id ?? '', kind: 'presentation' },
    ])
    mocks.listTopicProgressForCourse.mockResolvedValue([])
    mocks.listAttemptSummariesForStudentCourse.mockResolvedValue([])
    mocks.listPublishedQuizzesForCourse.mockResolvedValue([])
    mocks.countQuizQuestionsByQuizIds.mockResolvedValue(new Map())
    mocks.requestEnrollmentRecord.mockResolvedValue(pendingEnrollment)
    mocks.listEnrollmentsForStudent.mockResolvedValue([
      activeEnrollment,
      pendingEnrollment,
    ])
    mocks.findStudentEnrollment.mockResolvedValue(activeEnrollment)
    mocks.findEnrollmentById.mockResolvedValue(activeEnrollment)
    mocks.findEnrollmentForInstructor.mockResolvedValue(activeEnrollment)
    mocks.listEnrollmentsForCourse.mockResolvedValue([
      pendingEnrollment,
      activeEnrollment,
    ])
    mocks.listStudentsByIds.mockResolvedValue(
      new Map([
        [
          'student-1',
          { id: 'student-1', username: 'student_one', faculty: 'BSIT' },
        ],
        [
          'student-2',
          { id: 'student-2', username: 'student_two', faculty: 'BSIT' },
        ],
      ]),
    )
    mocks.updateEnrollmentStatus.mockResolvedValue(activeEnrollment)
    mocks.updateCourseEnrollmentSettings.mockResolvedValue(course)
    mocks.findCourseEnrollmentPreview.mockResolvedValue(enrollmentCourse)
    mocks.listStudentEnrollmentCourses.mockResolvedValue([enrollmentCourse])
    mocks.toCourseEnrollmentList.mockImplementation(
      (enrollments: typeof activeEnrollment[], students: Map<string, unknown>) =>
        enrollments.flatMap((enrollment) => {
          const student = students.get(enrollment.studentId)
          return student ? [{ ...enrollment, student }] : []
        }),
    )
  })

  it('requires authentication', async () => {
    const response = await request(app).get('/api/enrollments/me')

    expect(response.status).toBe(401)
  })

  it('rejects instructors on student endpoints', async () => {
    mocks.findProfileById.mockResolvedValue(instructorProfile)

    const response = await request(app)
      .get('/api/enrollments/me')
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(403)
  })

  it('returns active and pending subjects for a student', async () => {
    const response = await request(app)
      .get('/api/enrollments/me')
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(200)
    expect(response.body.data.active).toHaveLength(1)
    expect(response.body.data.pending).toHaveLength(1)
    expect(response.body.data.active[0].course.instructorUsername).toBe(
      'teacher_one',
    )
  })

  it('returns an invite preview', async () => {
    const response = await request(app)
      .get(`/api/enrollments/join/${courseId}`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(200)
    expect(response.body.data.course.code).toBe('WEB101')
    expect(response.body.data.enrollmentMode).toBe('approval')
    expect(response.body.data.status).toBe('active')
  })

  it('requests enrollment', async () => {
    const response = await request(app)
      .post('/api/enrollments')
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({ courseId })

    expect(response.status).toBe(200)
    expect(mocks.requestEnrollmentRecord).toHaveBeenCalledWith(
      courseId,
      'student-1',
    )
    expect(response.body.data.status).toBe('pending')
  })

  it('resolves a class code to a subject', async () => {
    mocks.findCourseIdByJoinCode.mockResolvedValue(courseId)

    const response = await request(app)
      .post('/api/enrollments/join-code')
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({ code: 'k7m2qx' })

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({ courseId })
    expect(mocks.findCourseIdByJoinCode).toHaveBeenCalledWith('K7M2QX')
  })

  it('returns 404 for an unknown class code', async () => {
    const response = await request(app)
      .post('/api/enrollments/join-code')
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({ code: 'ABC123' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('CLASS_CODE_NOT_FOUND')
  })

  it('rejects a malformed class code', async () => {
    const response = await request(app)
      .post('/api/enrollments/join-code')
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({ code: 'ABC' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects instructors on the class-code lookup', async () => {
    mocks.findProfileById.mockResolvedValue(instructorProfile)

    const response = await request(app)
      .post('/api/enrollments/join-code')
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({ code: 'ABC123' })

    expect(response.status).toBe(403)
  })

  it('returns the subject table of contents for active students', async () => {
    const response = await request(app)
      .get(`/api/student/subjects/${courseId}`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(200)
    expect(response.body.data.topics).toHaveLength(1)
    expect(response.body.data.topics[0].lessons[0].title).toBe('Semantic HTML')
    expect(response.body.data.instructorUsername).toBe('teacher_one')
  })

  it('hides a subject when enrollment is not active', async () => {
    mocks.findStudentEnrollment.mockResolvedValue(pendingEnrollment)

    const response = await request(app)
      .get(`/api/student/subjects/${courseId}`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('SUBJECT_NOT_FOUND')
  })

  it('returns the teacher roster', async () => {
    mocks.findProfileById.mockResolvedValue(instructorProfile)

    const response = await request(app)
      .get(`/api/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(200)
    expect(response.body.data.pending).toHaveLength(1)
    expect(response.body.data.active).toHaveLength(1)
    expect(response.body.data.course.instructorUsername).toBe('teacher_one')
  })

  it('updates enrollment settings', async () => {
    mocks.findProfileById.mockResolvedValue(instructorProfile)

    const response = await request(app)
      .patch(`/api/courses/${courseId}/enrollment-settings`)
      .set('Authorization', `Bearer ${await signTestToken()}`)
      .send({ open: true, mode: 'auto' })

    expect(response.status).toBe(200)
    expect(mocks.updateCourseEnrollmentSettings).toHaveBeenCalledWith(
      courseId,
      true,
      'auto',
    )
  })

  it('approves a pending request', async () => {
    mocks.findProfileById.mockResolvedValue(instructorProfile)
    mocks.findEnrollmentForInstructor.mockResolvedValue(pendingEnrollment)

    const response = await request(app)
      .post(`/api/enrollments/${pendingId}/approve`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(200)
    expect(mocks.updateEnrollmentStatus).toHaveBeenCalledWith(
      pendingId,
      'active',
      'teacher-1',
    )
  })

  it('rejects a pending request', async () => {
    mocks.findProfileById.mockResolvedValue(instructorProfile)
    mocks.findEnrollmentForInstructor.mockResolvedValue(pendingEnrollment)

    const response = await request(app)
      .post(`/api/enrollments/${pendingId}/reject`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(200)
    expect(mocks.updateEnrollmentStatus).toHaveBeenCalledWith(
      pendingId,
      'rejected',
      'teacher-1',
    )
  })

  it('removes an enrolled student', async () => {
    mocks.findProfileById.mockResolvedValue(instructorProfile)

    const response = await request(app)
      .delete(`/api/enrollments/${enrollmentId}`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(200)
    expect(mocks.updateEnrollmentStatus).toHaveBeenCalledWith(
      enrollmentId,
      'removed',
      'teacher-1',
    )
  })

  it('returns 404 when another teacher manages an enrollment', async () => {
    mocks.findProfileById.mockResolvedValue(instructorProfile)
    mocks.findEnrollmentForInstructor.mockResolvedValue(null)

    const response = await request(app)
      .post(`/api/enrollments/${pendingId}/approve`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('ENROLLMENT_NOT_FOUND')
  })

  it('rejects students on teacher enrollment routes', async () => {
    const response = await request(app)
      .get(`/api/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${await signTestToken()}`)

    expect(response.status).toBe(403)
  })
})
