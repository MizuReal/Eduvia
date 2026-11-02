import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StudentEnrollPage } from '../pages/StudentEnrollPage'
import { StudentPage } from '../pages/StudentPage'
import { StudentSubjectPage } from '../pages/StudentSubjectPage'
import { StudentTopicPage } from '../pages/StudentTopicPage'

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
}))

vi.mock('../services/enrollmentService', () => enrollmentMocks)

const studentContentMocks = vi.hoisted(() => ({
  getStudentTopicContent: vi.fn(),
}))

vi.mock('../services/studentContentService', () => studentContentMocks)

vi.mock('../components/content/TiptapRenderer', () => ({
  TiptapRenderer: ({ label }: { label: string }) => <p>{label}</p>,
}))

const courseId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const timestamp = '2026-11-02T00:00:00.000Z'

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
    studentAuth()
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
