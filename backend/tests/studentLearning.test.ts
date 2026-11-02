import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../src/errors/AppError.js'
import {
  getStudentSubjectWorkspace,
  getStudentTopicContent,
  recordSlideProgress,
  startQuizAttempt,
  submitStudentAttempt,
} from '../src/services/studentLearningService.js'

const { mocks } = vi.hoisted(() => {
  const mocks = {
    findStudentEnrollment: vi.fn(),
    findCourseEnrollmentPreview: vi.fn(),
    listTopicsAndLessons: vi.fn(),
    findTopicById: vi.fn(),
    listContentForTopic: vi.fn(),
    listTopicSlideSources: vi.fn(),
    listContentPresenceForCourse: vi.fn(),
    listTopicProgressForCourse: vi.fn(),
    listAttemptSummariesForStudentCourse: vi.fn(),
    findLatestAttempt: vi.fn(),
    findInProgressAttempt: vi.fn(),
    findAttemptById: vi.fn(),
    listAttemptAnswers: vi.fn(),
    createQuizAttempt: vi.fn(),
    saveAttemptAnswers: vi.fn(),
    gradeAttempt: vi.fn(),
    recordTopicSlideProgress: vi.fn(),
    buildStudentTopicMaterials: vi.fn(),
    getTopicSlideCount: vi.fn(),
    signFileForDelivery: vi.fn(),
    getQuizById: vi.fn(),
    listPublishedQuizzesForCourse: vi.fn(),
    countQuizQuestionsByQuizIds: vi.fn(),
    listQuizQuestions: vi.fn(),
    findFileForQuiz: vi.fn(),
  }

  return { mocks }
})

vi.mock('../src/db/enrollments.js', () => ({
  findStudentEnrollment: mocks.findStudentEnrollment,
  findCourseEnrollmentPreview: mocks.findCourseEnrollmentPreview,
}))

vi.mock('../src/db/courseOutline.js', () => ({
  listTopicsAndLessons: mocks.listTopicsAndLessons,
  findTopicById: mocks.findTopicById,
}))

vi.mock('../src/db/topicContent.js', () => ({
  listContentPresenceForCourse: mocks.listContentPresenceForCourse,
  listContentForTopic: mocks.listContentForTopic,
  listTopicSlideSources: mocks.listTopicSlideSources,
}))

vi.mock('../src/db/learning.js', () => ({
  findTopicProgress: vi.fn(),
  listTopicProgressForCourse: mocks.listTopicProgressForCourse,
  recordTopicSlideProgress: mocks.recordTopicSlideProgress,
  listAttemptSummariesForStudentCourse: mocks.listAttemptSummariesForStudentCourse,
  findLatestAttempt: mocks.findLatestAttempt,
  findInProgressAttempt: mocks.findInProgressAttempt,
  findAttemptById: mocks.findAttemptById,
  listAttemptAnswers: mocks.listAttemptAnswers,
  createQuizAttempt: mocks.createQuizAttempt,
  saveAttemptAnswers: mocks.saveAttemptAnswers,
  gradeAttempt: mocks.gradeAttempt,
}))

vi.mock('../src/db/quizzes.js', () => ({
  getQuizById: mocks.getQuizById,
  listPublishedQuizzesForCourse: mocks.listPublishedQuizzesForCourse,
  countQuizQuestionsByQuizIds: mocks.countQuizQuestionsByQuizIds,
  listQuizQuestions: mocks.listQuizQuestions,
  findFileForQuiz: mocks.findFileForQuiz,
}))

vi.mock('../src/services/topicContentService.js', () => ({
  buildStudentTopicMaterials: mocks.buildStudentTopicMaterials,
  getTopicSlideCount: mocks.getTopicSlideCount,
}))

vi.mock('../src/services/fileService.js', () => ({
  signFileForDelivery: mocks.signFileForDelivery,
}))

const courseId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const topicOneId = '11111111-1111-4111-8111-111111111111'
const topicTwoId = '22222222-2222-4222-8222-222222222222'
const quizId = '33333333-3333-4333-8333-333333333333'
const questionOneId = '44444444-4444-4444-8444-444444444444'
const questionTwoId = '55555555-5555-4555-8555-555555555555'
const attemptId = '66666666-6666-4666-8666-666666666666'
const timestamp = '2026-11-02T00:00:00.000Z'

const student = {
  id: 'student-1',
  username: 'student_one',
  firstName: 'Student',
  middleName: 'One',
  lastName: 'Test',
  role: 'student' as const,
  faculty: 'BSIT' as const,
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

const topics = [
  {
    id: topicOneId,
    title: 'HTML foundations',
    orderIndex: 0,
    lessons: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: topicTwoId,
    title: 'CSS layout',
    orderIndex: 1,
    lessons: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  },
]

const quiz = {
  id: quizId,
  course_id: courseId,
  topic_id: topicOneId,
  mode: 'native' as const,
  title: 'HTML quiz',
  instructions: 'Choose one answer.',
  passing_score: 75,
  status: 'published' as const,
  version: 1,
  file_id: null,
  deleted_at: null,
  created_at: timestamp,
  updated_at: timestamp,
}

function questionRow(
  id: string,
  orderIndex: number,
  correctOption: 'A' | 'B' | 'C' | 'D',
) {
  return {
    id,
    quiz_id: quizId,
    order_index: orderIndex,
    prompt: `Question ${orderIndex + 1}`,
    option_a: 'Option A',
    option_b: 'Option B',
    option_c: 'Option C',
    option_d: 'Option D',
    correct_option: correctOption,
    explanation: null,
    points: 1,
    deleted_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  }
}

function attemptRow(
  status: 'in_progress' | 'graded',
  passed: boolean | null,
  score: number | null,
  maxScore: number | null,
  percentage: number | null,
) {
  return {
    id: attemptId,
    quizId,
    courseId,
    topicId: topicOneId,
    studentId: 'student-1',
    attemptNumber: 1,
    status,
    snapshot: {
      quizId,
      version: 1,
      mode: 'native' as const,
      title: 'HTML quiz',
      instructions: 'Choose one answer.',
      passingScore: 75,
      fileId: null,
      questions: [
        {
          id: questionOneId,
          orderIndex: 0,
          prompt: 'Question 1',
          optionA: 'Option A',
          optionB: 'Option B',
          optionC: 'Option C',
          optionD: 'Option D',
          points: 1,
          correctOption: 'A' as const,
          explanation: null,
        },
        {
          id: questionTwoId,
          orderIndex: 1,
          prompt: 'Question 2',
          optionA: 'Option A',
          optionB: 'Option B',
          optionC: 'Option C',
          optionD: 'Option D',
          points: 1,
          correctOption: 'B' as const,
          explanation: null,
        },
      ],
    },
    score,
    maxScore,
    percentage,
    passed,
    startedAt: timestamp,
    submittedAt: status === 'graded' ? timestamp : null,
    gradedAt: status === 'graded' ? timestamp : null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

const activeEnrollment = {
  id: '77777777-7777-4777-8777-777777777777',
  courseId,
  studentId: 'student-1',
  status: 'active' as const,
  decidedAt: timestamp,
  removedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
}

const completedProgress = {
  id: '88888888-8888-4888-8888-888888888888',
  courseId,
  topicId: topicOneId,
  studentId: 'student-1',
  presentationHighestSlideIndex: 0,
  slidesHighestSlideIndex: -1,
  presentationCompleted: true,
  slidesCompleted: false,
  createdAt: timestamp,
  updatedAt: timestamp,
}

describe('student learning service', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
    mocks.findStudentEnrollment.mockResolvedValue(activeEnrollment)
    mocks.findCourseEnrollmentPreview.mockResolvedValue(course)
    mocks.listTopicsAndLessons.mockResolvedValue(topics)
    mocks.listContentPresenceForCourse.mockResolvedValue([
      { topic_id: topicOneId, kind: 'presentation' },
      { topic_id: topicTwoId, kind: 'slides' },
    ])
    mocks.listContentForTopic.mockResolvedValue([])
    mocks.listTopicProgressForCourse.mockResolvedValue([])
    mocks.listAttemptSummariesForStudentCourse.mockResolvedValue([])
    mocks.listPublishedQuizzesForCourse.mockResolvedValue([quiz])
    mocks.countQuizQuestionsByQuizIds.mockResolvedValue(
      new Map([[quizId, 2]]),
    )
    mocks.listQuizQuestions.mockResolvedValue([
      questionRow(questionOneId, 0, 'A'),
      questionRow(questionTwoId, 1, 'B'),
    ])
    mocks.getQuizById.mockResolvedValue(quiz)
    mocks.findLatestAttempt.mockResolvedValue(null)
    mocks.findInProgressAttempt.mockResolvedValue(null)
    mocks.listAttemptAnswers.mockResolvedValue([])
    mocks.findFileForQuiz.mockResolvedValue(null)
  })

  it('locks later topics until the previous topic is complete', async () => {
    const workspace = await getStudentSubjectWorkspace(student, courseId)

    expect(workspace.topics[0]?.status).toBe('not_started')
    expect(workspace.topics[0]?.locked).toBe(false)
    expect(workspace.topics[1]?.status).toBe('locked')
    expect(workspace.topics[1]?.locked).toBe(true)
  })

  it('loads topic content from one course snapshot', async () => {
    mocks.findTopicById.mockResolvedValue({
      id: topicOneId,
      course_id: courseId,
      title: 'HTML foundations',
      order_index: 0,
      created_at: timestamp,
      updated_at: timestamp,
    })
    mocks.listTopicProgressForCourse.mockResolvedValue([completedProgress])
    mocks.listAttemptSummariesForStudentCourse.mockResolvedValue([
      attemptRow('graded', true, 2, 2, 100),
    ])
    mocks.buildStudentTopicMaterials.mockResolvedValue({
      topic: { id: topicOneId, title: 'HTML foundations', courseId },
      slides: null,
      upload: null,
      summary: '',
    })

    const content = await getStudentTopicContent(student, topicOneId)

    expect(mocks.findLatestAttempt).not.toHaveBeenCalled()
    expect(content.status).toBe('passed')
    expect(content.latestAttempt).toEqual({
      percentage: 100,
      passed: true,
      gradedAt: timestamp,
    })
  })

  it('skips writing slide progress that has not advanced', async () => {
    mocks.findTopicById.mockResolvedValue({
      id: topicOneId,
      course_id: courseId,
      title: 'HTML foundations',
      order_index: 0,
      created_at: timestamp,
      updated_at: timestamp,
    })
    mocks.getTopicSlideCount.mockResolvedValue(2)
    mocks.listTopicProgressForCourse.mockResolvedValue([completedProgress])

    const progress = await recordSlideProgress(student, topicOneId, 'upload', 0)

    expect(mocks.recordTopicSlideProgress).not.toHaveBeenCalled()
    expect(progress.completed).toBe(true)
  })

  it('writes slide progress when the student advances', async () => {
    mocks.findTopicById.mockResolvedValue({
      id: topicOneId,
      course_id: courseId,
      title: 'HTML foundations',
      order_index: 0,
      created_at: timestamp,
      updated_at: timestamp,
    })
    mocks.getTopicSlideCount.mockResolvedValue(2)
    mocks.recordTopicSlideProgress.mockResolvedValue({
      ...completedProgress,
      presentationHighestSlideIndex: 1,
    })

    await recordSlideProgress(student, topicOneId, 'upload', 1)

    expect(mocks.recordTopicSlideProgress).toHaveBeenCalledWith({
      courseId,
      topicId: topicOneId,
      studentId: 'student-1',
      source: 'presentation',
      slideIndex: 1,
      slideCount: 2,
    })
  })

  it('unlocks the next topic after the previous quiz is passed', async () => {
    mocks.listTopicProgressForCourse.mockResolvedValue([completedProgress])
    mocks.listAttemptSummariesForStudentCourse.mockResolvedValue([
      attemptRow('graded', true, 2, 2, 100),
    ])

    const workspace = await getStudentSubjectWorkspace(student, courseId)

    expect(workspace.topics[0]?.status).toBe('passed')
    expect(workspace.topics[1]?.status).toBe('not_started')
    expect(workspace.topics[1]?.locked).toBe(false)
  })

  it('rejects starting a quiz before the slides are complete', async () => {
    await expect(startQuizAttempt(student, quizId)).rejects.toMatchObject({
      code: 'SLIDES_NOT_COMPLETE',
    })
  })

  it('creates a snapshot when starting a quiz', async () => {
    mocks.listTopicProgressForCourse.mockResolvedValue([completedProgress])
    mocks.createQuizAttempt.mockImplementation(async () =>
      attemptRow('in_progress', null, null, null, null),
    )

    const attempt = await startQuizAttempt(student, quizId)

    expect(mocks.createQuizAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        quizId,
        courseId,
        topicId: topicOneId,
        studentId: 'student-1',
        snapshot: expect.objectContaining({
          questions: expect.arrayContaining([
            expect.objectContaining({
              id: questionOneId,
              correctOption: 'A',
            }),
          ]),
        }),
      }),
    )
    expect(attempt.status).toBe('in_progress')
    expect(attempt.questions[0]).not.toHaveProperty('correctOption')
  })

  it('rejects a new attempt after the quiz is passed', async () => {
    mocks.listTopicProgressForCourse.mockResolvedValue([completedProgress])
    mocks.listAttemptSummariesForStudentCourse.mockResolvedValue([
      attemptRow('graded', true, 2, 2, 100),
    ])
    mocks.findLatestAttempt.mockResolvedValue(
      attemptRow('graded', true, 2, 2, 100),
    )

    await expect(startQuizAttempt(student, quizId)).rejects.toMatchObject({
      code: 'QUIZ_ALREADY_PASSED',
    })
    expect(mocks.createQuizAttempt).not.toHaveBeenCalled()
  })

  it('allows a new attempt after a failed quiz', async () => {
    mocks.listTopicProgressForCourse.mockResolvedValue([completedProgress])
    mocks.listAttemptSummariesForStudentCourse.mockResolvedValue([
      attemptRow('graded', false, 0, 2, 0),
    ])
    mocks.findLatestAttempt.mockResolvedValue(
      attemptRow('graded', false, 0, 2, 0),
    )
    mocks.createQuizAttempt.mockImplementation(async () =>
      attemptRow('in_progress', null, null, null, null),
    )

    const attempt = await startQuizAttempt(student, quizId)

    expect(mocks.createQuizAttempt).toHaveBeenCalled()
    expect(attempt.status).toBe('in_progress')
  })

  it('rejects a document quiz without a ready paper', async () => {
    mocks.listTopicProgressForCourse.mockResolvedValue([completedProgress])
    mocks.getQuizById.mockResolvedValue({
      ...quiz,
      mode: 'document' as const,
      file_id: null,
    })

    await expect(startQuizAttempt(student, quizId)).rejects.toMatchObject({
      code: 'QUIZ_NOT_READY',
    })
    expect(mocks.createQuizAttempt).not.toHaveBeenCalled()
  })

  it('grades a submitted attempt and stores the result', async () => {
    mocks.findAttemptById
      .mockResolvedValueOnce(attemptRow('in_progress', null, null, null, null))
      .mockResolvedValueOnce(attemptRow('graded', true, 2, 2, 100))
    mocks.listAttemptAnswers
      .mockResolvedValueOnce([
        {
          questionId: questionOneId,
          selectedOption: 'A',
          isCorrect: null,
          pointsAwarded: null,
        },
        {
          questionId: questionTwoId,
          selectedOption: 'B',
          isCorrect: null,
          pointsAwarded: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          questionId: questionOneId,
          selectedOption: 'A',
          isCorrect: true,
          pointsAwarded: 1,
        },
        {
          questionId: questionTwoId,
          selectedOption: 'B',
          isCorrect: true,
          pointsAwarded: 1,
        },
      ])

    const attempt = await submitStudentAttempt(student, attemptId)

    expect(mocks.gradeAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptId,
        studentId: 'student-1',
        score: 2,
        maxScore: 2,
        percentage: 100,
        passed: true,
      }),
    )
    expect(attempt.result?.passed).toBe(true)
    expect(attempt.result?.percentage).toBe(100)
  })

  it('rejects submission when answers are missing', async () => {
    mocks.findAttemptById.mockResolvedValue(
      attemptRow('in_progress', null, null, null, null),
    )
    mocks.listAttemptAnswers.mockResolvedValue([
      {
        questionId: questionOneId,
        selectedOption: 'A',
        isCorrect: null,
        pointsAwarded: null,
      },
    ])

    await expect(
      submitStudentAttempt(student, attemptId),
    ).rejects.toBeInstanceOf(AppError)
    expect(mocks.gradeAttempt).not.toHaveBeenCalled()
  })

  it('omits correct options from a failed result', async () => {
    mocks.findAttemptById
      .mockResolvedValueOnce(attemptRow('in_progress', null, null, null, null))
      .mockResolvedValueOnce(attemptRow('graded', false, 1, 2, 50))
    mocks.listAttemptAnswers
      .mockResolvedValueOnce([
        {
          questionId: questionOneId,
          selectedOption: 'B',
          isCorrect: null,
          pointsAwarded: null,
        },
        {
          questionId: questionTwoId,
          selectedOption: 'B',
          isCorrect: null,
          pointsAwarded: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          questionId: questionOneId,
          selectedOption: 'B',
          isCorrect: false,
          pointsAwarded: 0,
        },
        {
          questionId: questionTwoId,
          selectedOption: 'B',
          isCorrect: true,
          pointsAwarded: 1,
        },
      ])

    const attempt = await submitStudentAttempt(student, attemptId)

    expect(mocks.gradeAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        passed: false,
        score: 1,
        maxScore: 2,
        percentage: 50,
      }),
    )
    expect(attempt.result?.passed).toBe(false)
    expect(
      attempt.result?.answers.every((answer) => answer.correctOption === null),
    ).toBe(true)
  })
})
