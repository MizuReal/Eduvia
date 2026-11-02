import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StudentEnrollPage } from '../pages/StudentEnrollPage'
import { StudentPage } from '../pages/StudentPage'
import { StudentSubjectPage } from '../pages/StudentSubjectPage'
import { StudentTopicPage } from '../pages/StudentTopicPage'
import { ApiError } from '../services/apiClient'

type MockProfile = {
  id: string
  username: string
  role: 'student' | 'instructor' | 'admin'
  faculty: 'BSIT' | 'BSEE' | 'BSME'
}

type MockAuthState = {
  status: 'loading' | 'authenticated' | 'anonymous'
  session: { access_token: string } | null
  profile: MockProfile | null
  profileError: string | null
}

const authState = vi.hoisted(() => ({
  current: {
    status: 'authenticated',
    session: { access_token: 'test-token' },
    profile: {
      id: 'student-1',
      username: 'student_one',
      role: 'student',
      faculty: 'BSIT',
    },
    profileError: null,
  } as MockAuthState,
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState.current,
}))

const enrollmentMocks = vi.hoisted(() => ({
  getStudentDashboard: vi.fn(),
  getEnrollmentJoinPreview: vi.fn(),
  requestEnrollment: vi.fn(),
  getStudentSubject: vi.fn(),
  lookupClassCode: vi.fn(),
}))

vi.mock('../services/enrollmentService', () => enrollmentMocks)

const studentContentMocks = vi.hoisted(() => ({
  getStudentTopicContent: vi.fn(),
}))

vi.mock('../services/studentContentService', () => studentContentMocks)

const learningMocks = vi.hoisted(() => ({
  recordSlideProgress: vi.fn(),
  startQuizAttempt: vi.fn(),
  saveAttemptAnswers: vi.fn(),
  submitAttempt: vi.fn(),
}))

vi.mock('../services/learningService', () => learningMocks)

const quizResultsMocks = vi.hoisted(() => ({
  getOwnQuizResults: vi.fn(),
}))

vi.mock('../services/quizResultsService', () => quizResultsMocks)

vi.mock('../components/content/TiptapRenderer', () => ({
  TiptapRenderer: ({ label }: { label: string }) => <p>{label}</p>,
}))

const courseId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const timestamp = '2026-11-02T00:00:00.000Z'

const course = {
  id: courseId,
  name: 'Web Systems',
  code: 'WEB101',
  joinCode: 'K7M2QX',
  term: 'first_trimester' as const,
  yearLevel: 2 as const,
  enrollmentOpen: true,
  enrollmentMode: 'approval' as const,
  instructorUsername: 'teacher_one',
  createdAt: timestamp,
  updatedAt: timestamp,
}

const activeEnrollment = {
  id: '11111111-1111-4111-8111-111111111111',
  courseId,
  studentId: 'student-1',
  status: 'active' as const,
  decidedAt: timestamp,
  removedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
  course,
}

const pendingEnrollment = {
  ...activeEnrollment,
  id: '22222222-2222-4222-8222-222222222222',
  status: 'pending' as const,
}

const subject = {
  ...course,
  progress: {
    completedTopics: 0,
    totalTopics: 1,
    percent: 0,
  },
  topics: [
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
      status: 'not_started' as const,
      locked: false,
      progress: {
        presentationHighestSlideIndex: -1,
        slidesHighestSlideIndex: -1,
        presentationCompleted: false,
        slidesCompleted: false,
        completed: false,
      },
      quiz: null,
    },
  ],
}

const topicId = '33333333-3333-4333-8333-333333333333'

const topicContent = {
  topic: {
    id: topicId,
    title: 'HTML foundations',
    courseId,
  },
  slides: {
    id: '55555555-5555-4555-8555-555555555555',
    courseId,
    topicId,
    kind: 'slides' as const,
    title: 'Created slides',
    orderIndex: 0,
    slideCount: 2,
    summary: null,
    file: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    assets: [],
    content: {
      version: 1 as const,
      slides: [
        {
          id: '66666666-6666-4666-8666-666666666666',
          content: { type: 'doc', content: [{ type: 'paragraph' }] },
        },
        {
          id: '77777777-7777-4777-8777-777777777777',
          content: { type: 'doc', content: [{ type: 'paragraph' }] },
        },
      ],
    },
  },
  upload: {
    id: '88888888-8888-4888-8888-888888888888',
    courseId,
    topicId,
    kind: 'presentation' as const,
    title: 'Uploaded lecture',
    orderIndex: 0,
    slideCount: null,
    summary: 'A presentation summary that is long enough to be valid.',
    createdAt: timestamp,
    updatedAt: timestamp,
    assets: [],
    content: {},
    file: {
      id: '99999999-9999-4999-8999-999999999999',
      originalName: 'lecture.pptx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      sizeBytes: 2048,
      fileClass: 'document' as const,
      width: null,
      height: null,
      status: 'ready' as const,
      url: 'https://signed.test/original',
      expiresAt: timestamp,
    },
    previews: [
      {
        pageNumber: 1,
        url: 'https://signed.test/slide-1',
        expiresAt: timestamp,
      },
      {
        pageNumber: 2,
        url: 'https://signed.test/slide-2',
        expiresAt: timestamp,
      },
    ],
  },
  summary: 'A presentation summary that is long enough to be valid.',
  progress: {
    presentationHighestSlideIndex: -1,
    slidesHighestSlideIndex: -1,
    presentationCompleted: false,
    slidesCompleted: false,
    completed: false,
  },
  quiz: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    title: 'HTML quiz',
    mode: 'native' as const,
    questionCount: 10,
    passingScore: 75,
  },
  status: 'not_started' as const,
  latestAttempt: null,
  locked: false,
  nextTopicId: null,
}

function studentAuth() {
  authState.current = {
    status: 'authenticated',
    session: { access_token: 'test-token' },
    profile: {
      id: 'student-1',
      username: 'student_one',
      role: 'student',
      faculty: 'BSIT',
    },
    profileError: null,
  }
}

describe('student pages', () => {
  beforeEach(() => {
    Object.values(enrollmentMocks).forEach((mock) => mock.mockReset())
    Object.values(studentContentMocks).forEach((mock) => mock.mockReset())
    Object.values(learningMocks).forEach((mock) => mock.mockReset())
    quizResultsMocks.getOwnQuizResults.mockReset()
    studentAuth()
    learningMocks.recordSlideProgress.mockImplementation(
      async () => topicContent.progress,
    )
    studentContentMocks.getStudentTopicContent.mockResolvedValue(topicContent)
    enrollmentMocks.getStudentDashboard.mockResolvedValue({
      active: [activeEnrollment],
      pending: [pendingEnrollment],
    })
    enrollmentMocks.getEnrollmentJoinPreview.mockResolvedValue({
      course,
      enrollmentOpen: true,
      enrollmentMode: 'approval',
      status: null,
    })
    enrollmentMocks.requestEnrollment.mockResolvedValue({
      course,
      enrollmentOpen: true,
      enrollmentMode: 'approval',
      status: 'pending',
    })
    enrollmentMocks.lookupClassCode.mockResolvedValue({ courseId })
    enrollmentMocks.getStudentSubject.mockResolvedValue(subject)
  })

  it('shows active and pending subjects on the dashboard', async () => {
    render(
      <MemoryRouter initialEntries={['/student']}>
        <Routes>
          <Route
            path="/student"
            element={<StudentPage onOpenAuth={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    const activeSection = await screen.findByRole('region', {
      name: 'Enrolled subjects',
    })

    expect(within(activeSection).getByText('Web Systems')).toBeInTheDocument()
    expect(screen.getByText('Pending requests')).toBeInTheDocument()
    expect(
      screen.getByText(/waiting for @teacher_one/i),
    ).toBeInTheDocument()
  })

  it('opens the subject preview from a class code', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/student']}>
        <Routes>
          <Route
            path="/student"
            element={<StudentPage onOpenAuth={vi.fn()} />}
          />
          <Route
            path="/student/enroll/:courseId"
            element={<StudentEnrollPage onOpenAuth={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Class code'), 'k7m2qx')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => {
      expect(enrollmentMocks.lookupClassCode).toHaveBeenCalledWith(
        'K7M2QX',
        'test-token',
      )
    })
    expect(
      await screen.findByRole('heading', { name: 'Web Systems' }),
    ).toBeInTheDocument()
  })

  it('shows an error for an unknown class code', async () => {
    const user = userEvent.setup()
    enrollmentMocks.lookupClassCode.mockRejectedValue(
      new ApiError(
        'CLASS_CODE_NOT_FOUND',
        'No subject matches that class code.',
        404,
      ),
    )

    render(
      <MemoryRouter initialEntries={['/student']}>
        <Routes>
          <Route
            path="/student"
            element={<StudentPage onOpenAuth={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Class code'), 'ABC123')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(
      await screen.findByText(
        'No subject matches that class code. Check the code and try again.',
      ),
    ).toBeInTheDocument()
  })

  it('requests enrollment from an invite link', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[`/student/enroll/${courseId}`]}>
        <Routes>
          <Route
            path="/student/enroll/:courseId"
            element={<StudentEnrollPage onOpenAuth={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(
      await screen.findByRole('button', { name: /request to enroll/i }),
    )

    await waitFor(() => {
      expect(enrollmentMocks.requestEnrollment).toHaveBeenCalledWith(
        courseId,
        'test-token',
      )
    })
    expect(
      await screen.findByText(/waiting for teacher approval/i),
    ).toBeInTheDocument()
  })

  it('shows the subject table of contents', async () => {
    render(
      <MemoryRouter initialEntries={[`/student/subjects/${courseId}`]}>
        <Routes>
          <Route
            path="/student/subjects/:courseId"
            element={<StudentSubjectPage onOpenAuth={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Web Systems' }),
    ).toBeInTheDocument()
    expect(screen.getByText('HTML foundations')).toBeInTheDocument()
    expect(screen.getByText('Semantic HTML')).toBeInTheDocument()
    expect(screen.getByText(/@teacher_one/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Open HTML foundations' }),
    ).toHaveAttribute(
      'href',
      `/student/subjects/${courseId}/topics/${topicId}`,
    )
  })

  it('shows uploaded slide previews and switches to created slides', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter
        initialEntries={[`/student/subjects/${courseId}/topics/${topicId}`]}
      >
        <Routes>
          <Route
            path="/student/subjects/:courseId/topics/:topicId"
            element={<StudentTopicPage onOpenAuth={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'HTML foundations' }),
    ).toBeInTheDocument()
    expect(screen.getByAltText('Slide 1 of 2')).toHaveAttribute(
      'src',
      'https://signed.test/slide-1',
    )

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByAltText('Slide 2 of 2')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Created slides' }),
    )
    expect(screen.getByText('Slide 1 content')).toBeInTheDocument()
  })

  it('does not write slide progress when the page first loads', async () => {
    render(
      <MemoryRouter
        initialEntries={[`/student/subjects/${courseId}/topics/${topicId}`]}
      >
        <Routes>
          <Route
            path="/student/subjects/:courseId/topics/:topicId"
            element={<StudentTopicPage onOpenAuth={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'HTML foundations' }),
    ).toBeInTheDocument()
    expect(learningMocks.recordSlideProgress).not.toHaveBeenCalled()
  })

  it('writes progress when the student moves to a new slide', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter
        initialEntries={[`/student/subjects/${courseId}/topics/${topicId}`]}
      >
        <Routes>
          <Route
            path="/student/subjects/:courseId/topics/:topicId"
            element={<StudentTopicPage onOpenAuth={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'HTML foundations' })
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(learningMocks.recordSlideProgress).toHaveBeenCalledWith(
        topicId,
        'upload',
        1,
        'test-token',
      )
    })
  })

  it('shows the summary and quiz confirmation after the slides are complete', async () => {
    const user = userEvent.setup()
    const completedProgress = {
      ...topicContent.progress,
      completed: true,
    }
    learningMocks.recordSlideProgress.mockResolvedValue(completedProgress)
    studentContentMocks.getStudentTopicContent.mockResolvedValue({
      ...topicContent,
      progress: completedProgress,
      status: 'ready' as const,
    })

    render(
      <MemoryRouter
        initialEntries={[`/student/subjects/${courseId}/topics/${topicId}`]}
      >
        <Routes>
          <Route
            path="/student/subjects/:courseId/topics/:topicId"
            element={<StudentTopicPage onOpenAuth={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Topic summary' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Take quiz' }))

    expect(
      await screen.findByRole('heading', {
        name: 'Ready to take the quiz?',
      }),
    ).toBeInTheDocument()
  })

  it('shows a congratulatory state for a passed topic', async () => {
    const completedProgress = {
      ...topicContent.progress,
      completed: true,
    }
    learningMocks.recordSlideProgress.mockResolvedValue(completedProgress)
    studentContentMocks.getStudentTopicContent.mockResolvedValue({
      ...topicContent,
      progress: completedProgress,
      status: 'passed' as const,
      latestAttempt: {
        percentage: 90,
        passed: true,
        gradedAt: timestamp,
      },
    })

    render(
      <MemoryRouter
        initialEntries={[`/student/subjects/${courseId}/topics/${topicId}`]}
      >
        <Routes>
          <Route
            path="/student/subjects/:courseId/topics/:topicId"
            element={<StudentTopicPage onOpenAuth={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Congratulations!' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/with 90%/)).toBeInTheDocument()
  })

  it('shows a locked topic state when direct access is denied', async () => {
    const { ApiError } = await import('../services/apiClient')
    studentContentMocks.getStudentTopicContent.mockRejectedValue(
      new ApiError(
        'TOPIC_LOCKED',
        'Finish the previous topic to unlock this one.',
        403,
      ),
    )

    render(
      <MemoryRouter
        initialEntries={[`/student/subjects/${courseId}/topics/${topicId}`]}
      >
        <Routes>
          <Route
            path="/student/subjects/:courseId/topics/:topicId"
            element={<StudentTopicPage onOpenAuth={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Topic locked' }),
    ).toBeInTheDocument()
  })

  it('shows a not-passed topic with a retry action', async () => {
    const completedProgress = {
      ...topicContent.progress,
      completed: true,
    }
    learningMocks.recordSlideProgress.mockResolvedValue(completedProgress)
    studentContentMocks.getStudentTopicContent.mockResolvedValue({
      ...topicContent,
      progress: completedProgress,
      status: 'not_passed' as const,
      latestAttempt: {
        percentage: 50,
        passed: false,
        gradedAt: timestamp,
      },
    })

    render(
      <MemoryRouter
        initialEntries={[`/student/subjects/${courseId}/topics/${topicId}`]}
      >
        <Routes>
          <Route
            path="/student/subjects/:courseId/topics/:topicId"
            element={<StudentTopicPage onOpenAuth={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Not passed yet' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument()
  })

  it('marks locked subjects and hides their open link', async () => {
    enrollmentMocks.getStudentSubject.mockResolvedValue({
      ...subject,
      topics: [
        {
          ...subject.topics[0],
          status: 'locked' as const,
          locked: true,
        },
      ],
    })

    render(
      <MemoryRouter initialEntries={[`/student/subjects/${courseId}`]}>
        <Routes>
          <Route
            path="/student/subjects/:courseId"
            element={<StudentSubjectPage onOpenAuth={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Locked')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Open HTML foundations' }),
    ).not.toBeInTheDocument()
  })

  it('loads the student quiz summary on request', async () => {
    const user = userEvent.setup()
    quizResultsMocks.getOwnQuizResults.mockResolvedValue({
      course,
      student: {
        id: 'student-1',
        username: 'student_one',
        faculty: 'BSIT',
      },
      rows: [
        {
          topicId: '33333333-3333-4333-8333-333333333333',
          topicTitle: 'HTML foundations',
          topicOrderIndex: 0,
          quizId: '66666666-6666-4666-8666-666666666666',
          quizTitle: 'HTML quiz',
          quizMode: 'native' as const,
          passingScore: 75,
          attempts: 1,
          bestScore: 8,
          maxScore: 10,
          percentage: 80,
          status: 'passed' as const,
          lastSubmittedAt: timestamp,
        },
      ],
    })

    render(
      <MemoryRouter initialEntries={[`/student/subjects/${courseId}`]}>
        <Routes>
          <Route
            path="/student/subjects/:courseId"
            element={<StudentSubjectPage onOpenAuth={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(
      await screen.findByRole('button', { name: 'View summary' }),
    )

    expect(await screen.findByText('HTML quiz')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Export CSV' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Print / PDF' }),
    ).toBeInTheDocument()
  })

  it('shows an error when the quiz summary cannot load', async () => {
    const user = userEvent.setup()
    quizResultsMocks.getOwnQuizResults.mockRejectedValue(
      new ApiError('SUMMARY_LOAD_FAILED', 'Could not load summary.', 503),
    )

    render(
      <MemoryRouter initialEntries={[`/student/subjects/${courseId}`]}>
        <Routes>
          <Route
            path="/student/subjects/:courseId"
            element={<StudentSubjectPage onOpenAuth={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(
      await screen.findByRole('button', { name: 'View summary' }),
    )

    expect(await screen.findByText('Could not load summary.')).toBeInTheDocument()
  })

  it('shows an empty state when a topic has no slides', async () => {
    studentContentMocks.getStudentTopicContent.mockResolvedValue({
      ...topicContent,
      slides: null,
      upload: null,
    })

    render(
      <MemoryRouter
        initialEntries={[`/student/subjects/${courseId}/topics/${topicId}`]}
      >
        <Routes>
          <Route
            path="/student/subjects/:courseId/topics/:topicId"
            element={<StudentTopicPage onOpenAuth={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', {
        name: 'No slides for this topic',
      }),
    ).toBeInTheDocument()
  })

  it('offers the original download when a presentation has no previews', async () => {
    studentContentMocks.getStudentTopicContent.mockResolvedValue({
      ...topicContent,
      slides: null,
      upload: { ...topicContent.upload, previews: [] },
    })

    render(
      <MemoryRouter
        initialEntries={[`/student/subjects/${courseId}/topics/${topicId}`]}
      >
        <Routes>
          <Route
            path="/student/subjects/:courseId/topics/:topicId"
            element={<StudentTopicPage onOpenAuth={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('button', { name: /download presentation/i }),
    ).toBeInTheDocument()
  })

  it('asks anonymous visitors to sign in', async () => {
    authState.current = {
      status: 'anonymous',
      session: null,
      profile: null,
      profileError: null,
    }

    render(
      <MemoryRouter initialEntries={['/student']}>
        <Routes>
          <Route
            path="/student"
            element={<StudentPage onOpenAuth={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Sign in to view your subjects',
      }),
    ).toBeInTheDocument()
  })
})
