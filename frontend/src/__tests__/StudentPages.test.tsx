import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StudentEnrollPage } from '../pages/StudentEnrollPage'
import { StudentPage } from '../pages/StudentPage'
import { StudentSubjectPage } from '../pages/StudentSubjectPage'

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
    studentAuth()
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
