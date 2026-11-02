import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { signTestToken } from '../src/test/authToken.js'

const { mocks } = vi.hoisted(() => {
  const mocks = {
    findProfileById: vi.fn(),
    findCourseForInstructor: vi.fn(),
    findTopicForInstructor: vi.fn(),
    listTopicsAndLessons: vi.fn(),
    listEnrollmentsForCourse: vi.fn(),
    listStudentsByIds: vi.fn(),
    findStudentEnrollment: vi.fn(),
    findQuizByTopic: vi.fn(),
    listPublishedQuizzesForCourse: vi.fn(),
    listGradedAttemptsForQuiz: vi.fn(),
    listGradedAttemptsForStudentCourse: vi.fn(),
  }

  return { mocks }
})

vi.mock('../src/db/profiles.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/db/profiles.js')>()

  return {
    ...actual,
    findProfileById: mocks.findProfileById,
  }
})

vi.mock('../src/db/courses.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/db/courses.js')>()

  return {
    ...actual,
    findCourseForInstructor: mocks.findCourseForInstructor,
  }
})

vi.mock('../src/db/courseOutline.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/db/courseOutline.js')>()

  return {
    ...actual,
    findTopicForInstructor: mocks.findTopicForInstructor,
    listTopicsAndLessons: mocks.listTopicsAndLessons,
  }
})

vi.mock('../src/db/enrollments.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/db/enrollments.js')>()

  return {
    ...actual,
    findStudentEnrollment: mocks.findStudentEnrollment,
    listEnrollmentsForCourse: mocks.listEnrollmentsForCourse,
    listStudentsByIds: mocks.listStudentsByIds,
  }
})

vi.mock('../src/db/quizzes.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/db/quizzes.js')>()

  return {
    ...actual,
    findQuizByTopic: mocks.findQuizByTopic,
    listPublishedQuizzesForCourse: mocks.listPublishedQuizzesForCourse,
  }
})

vi.mock('../src/db/learning.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/db/learning.js')>()

  return {
    ...actual,
    listGradedAttemptsForQuiz: mocks.listGradedAttemptsForQuiz,
    listGradedAttemptsForStudentCourse:
      mocks.listGradedAttemptsForStudentCourse,
  }
})

const app = createApp()

const courseId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const topicId = '11111111-1111-4111-8111-111111111111'
const secondTopicId = '22222222-2222-4222-8222-222222222222'
const quizId = '33333333-3333-4333-8333-333333333333'
const secondQuizId = '44444444-4444-4444-8444-444444444444'
const timestamp = '2026-11-02T00:00:00.000Z'
const laterTimestamp = '2026-11-03T00:00:00.000Z'

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
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  username: 'student_one',
  role: 'student',
}

const secondStudentProfile = {
  ...instructorProfile,
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  username: 'student_two',
  role: 'student',
}

const pendingStudentProfile = {
  ...instructorProfile,
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  username: 'student_three',
  role: 'student',
}

const course = {
  id: courseId,
  name: 'Web Systems',
  code: 'WEB101',
  term: 'first_trimester' as const,
  yearLevel: 2 as const,
  enrollmentOpen: true,
  enrollmentMode: 'approval' as const,
  createdAt: timestamp,
  updatedAt: timestamp,
}

const topic = {
  id: topicId,
  course_id: courseId,
  title: 'HTML foundations',
  order_index: 0,
  created_at: timestamp,
  updated_at: timestamp,
}

const quiz = {
  id: quizId,
  course_id: courseId,
  topic_id: topicId,
  mode: 'native' as const,
  title: 'HTML quiz',
  instructions: '',
  passing_score: 75,
  status: 'published' as const,
  version: 2,
  file_id: null,
  deleted_at: null,
  created_at: timestamp,
  updated_at: timestamp,
}

const secondQuiz = {
  ...quiz,
  id: secondQuizId,
  topic_id: secondTopicId,
  title: 'CSS quiz',
  version: 1,
}

const activeEnrollment = {
  id: '55555555-5555-4555-8555-555555555555',
  courseId,
  studentId: studentProfile.id,
  status: 'active' as const,
  decidedAt: timestamp,
  removedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
}

const secondActiveEnrollment = {
  ...activeEnrollment,
  id: '66666666-6666-4666-8666-666666666666',
  studentId: secondStudentProfile.id,
}

const pendingEnrollment = {
  ...activeEnrollment,
  id: '77777777-7777-4777-8777-777777777777',
  studentId: pendingStudentProfile.id,
  status: 'pending' as const,
  decidedAt: null,
}

const topics = [
  {
    id: topicId,
    title: 'HTML foundations',
    orderIndex: 0,
    lessons: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: secondTopicId,
    title: 'CSS layout',
    orderIndex: 1,
    lessons: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  },
]

function attempt(input: {
  id: string
  quizId: string
  topicId: string
  studentId: string
  attemptNumber: number
  score: number
  maxScore: number
  percentage: number
  passed: boolean
  submittedAt: string
}) {
  return {
    id: input.id,
    quizId: input.quizId,
    courseId,
    topicId: input.topicId,
    studentId: input.studentId,
    attemptNumber: input.attemptNumber,
    score: input.score,
    maxScore: input.maxScore,
    percentage: input.percentage,
    passed: input.passed,
    submittedAt: input.submittedAt,
    gradedAt: input.submittedAt,
  }
}

describe('quiz results API', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
    mocks.findProfileById.mockResolvedValue(instructorProfile)
    mocks.findCourseForInstructor.mockResolvedValue(course)
    mocks.findTopicForInstructor.mockResolvedValue(topic)
    mocks.findQuizByTopic.mockResolvedValue(quiz)
    mocks.listEnrollmentsForCourse.mockResolvedValue([
      activeEnrollment,
      secondActiveEnrollment,
      pendingEnrollment,
    ])
    mocks.listStudentsByIds.mockResolvedValue(
      new Map([
        [
          studentProfile.id,
          {
            id: studentProfile.id,
            username: studentProfile.username,
            faculty: studentProfile.faculty,
          },
        ],
        [
          secondStudentProfile.id,
          {
            id: secondStudentProfile.id,
            username: secondStudentProfile.username,
            faculty: secondStudentProfile.faculty,
          },
        ],
        [
          pendingStudentProfile.id,
          {
            id: pendingStudentProfile.id,
            username: pendingStudentProfile.username,
            faculty: pendingStudentProfile.faculty,
          },
        ],
      ]),
    )
    mocks.listGradedAttemptsForQuiz.mockResolvedValue([
      attempt({
        id: '88888888-8888-4888-8888-888888888888',
        quizId,
        topicId,
        studentId: studentProfile.id,
        attemptNumber: 1,
        score: 3,
        maxScore: 5,
        percentage: 60,
        passed: false,
        submittedAt: timestamp,
      }),
      attempt({
        id: '99999999-9999-4999-8999-999999999999',
        quizId,
        topicId,
        studentId: studentProfile.id,
        attemptNumber: 2,
        score: 4,
        maxScore: 5,
        percentage: 80,
        passed: true,
        submittedAt: laterTimestamp,
      }),
    ])
    mocks.listTopicsAndLessons.mockResolvedValue(topics)
    mocks.listPublishedQuizzesForCourse.mockResolvedValue([quiz, secondQuiz])
    mocks.findStudentEnrollment.mockResolvedValue(activeEnrollment)
    mocks.listGradedAttemptsForStudentCourse.mockResolvedValue([
      attempt({
        id: '88888888-8888-4888-8888-888888888888',
        quizId,
        topicId,
        studentId: studentProfile.id,
        attemptNumber: 1,
        score: 4,
        maxScore: 5,
        percentage: 80,
        passed: true,
        submittedAt: timestamp,
      }),
    ])
  })

  it('returns every active student with their best graded attempt', async () => {
    const response = await request(app)
      .get(`/api/topics/${topicId}/quiz/results`)
      .set(
        'Authorization',
        `Bearer ${await signTestToken(instructorProfile.id)}`,
      )

    expect(response.status).toBe(200)
    expect(response.body.data.quiz).toMatchObject({
      id: quizId,
      title: 'HTML quiz',
      passingScore: 75,
      version: 2,
    })
    expect(response.body.data.rows).toHaveLength(2)
    expect(response.body.data.rows[0]).toMatchObject({
      username: 'student_one',
      attempts: 2,
      bestScore: 4,
      maxScore: 5,
      percentage: 80,
      status: 'passed',
      lastSubmittedAt: laterTimestamp,
    })
    expect(response.body.data.rows[1]).toMatchObject({
      username: 'student_two',
      attempts: 0,
      bestScore: null,
      percentage: null,
      status: 'not_taken',
    })
  })

  it('returns an empty result when the topic has no quiz', async () => {
    mocks.findQuizByTopic.mockResolvedValue(null)

    const response = await request(app)
      .get(`/api/topics/${topicId}/quiz/results`)
      .set(
        'Authorization',
        `Bearer ${await signTestToken(instructorProfile.id)}`,
      )

    expect(response.status).toBe(200)
    expect(response.body.data.quiz).toBeNull()
    expect(response.body.data.rows).toEqual([])
    expect(mocks.listGradedAttemptsForQuiz).not.toHaveBeenCalled()
  })

  it('returns 404 for a topic the instructor does not own', async () => {
    mocks.findTopicForInstructor.mockResolvedValue(null)

    const response = await request(app)
      .get(`/api/topics/${topicId}/quiz/results`)
      .set(
        'Authorization',
        `Bearer ${await signTestToken(instructorProfile.id)}`,
      )

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('TOPIC_NOT_FOUND')
  })

  it('rejects student accounts', async () => {
    mocks.findProfileById.mockResolvedValue(studentProfile)

    const response = await request(app)
      .get(`/api/topics/${topicId}/quiz/results`)
      .set('Authorization', `Bearer ${await signTestToken(studentProfile.id)}`)

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })

  it('returns every published quiz for a student in topic order', async () => {
    const response = await request(app)
      .get(
        `/api/courses/${courseId}/students/${studentProfile.id}/quiz-results`,
      )
      .set(
        'Authorization',
        `Bearer ${await signTestToken(instructorProfile.id)}`,
      )

    expect(response.status).toBe(200)
    expect(response.body.data.student).toMatchObject({
      username: 'student_one',
      faculty: 'BSIT',
    })
    expect(response.body.data.rows).toHaveLength(2)
    expect(response.body.data.rows[0]).toMatchObject({
      topicTitle: 'HTML foundations',
      quizTitle: 'HTML quiz',
      attempts: 1,
      percentage: 80,
      status: 'passed',
    })
    expect(response.body.data.rows[1]).toMatchObject({
      topicTitle: 'CSS layout',
      quizTitle: 'CSS quiz',
      attempts: 0,
      percentage: null,
      status: 'not_taken',
    })
  })

  it('returns 404 when the course is not owned', async () => {
    mocks.findCourseForInstructor.mockResolvedValue(null)

    const response = await request(app)
      .get(
        `/api/courses/${courseId}/students/${studentProfile.id}/quiz-results`,
      )
      .set(
        'Authorization',
        `Bearer ${await signTestToken(instructorProfile.id)}`,
      )

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('COURSE_NOT_FOUND')
  })

  it('returns 404 when the student is not enrolled', async () => {
    mocks.findStudentEnrollment.mockResolvedValue(null)

    const response = await request(app)
      .get(
        `/api/courses/${courseId}/students/${studentProfile.id}/quiz-results`,
      )
      .set(
        'Authorization',
        `Bearer ${await signTestToken(instructorProfile.id)}`,
      )

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('STUDENT_NOT_FOUND')
  })
})
