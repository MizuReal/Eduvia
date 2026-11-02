import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StudentRosterPage } from '../pages/StudentRosterPage'

const authState = vi.hoisted(() => ({
  current: {
    status: 'authenticated',
    session: { access_token: 'test-token' },
    profile: {
      id: 'teacher-1',
      username: 'teacher_one',
      role: 'instructor',
      faculty: 'BSIT',
    },
    profileError: null,
  },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState.current,
}))

const enrollmentMocks = vi.hoisted(() => ({
  getCourseEnrollments: vi.fn(),
  updateEnrollmentSettings: vi.fn(),
  approveEnrollment: vi.fn(),
  rejectEnrollment: vi.fn(),
  removeEnrollment: vi.fn(),
}))

vi.mock('../services/enrollmentService', () => enrollmentMocks)

const courseId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const activeId = '11111111-1111-4111-8111-111111111111'
const pendingId = '22222222-2222-4222-8222-222222222222'
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
  id: activeId,
  courseId,
  studentId: 'student-1',
  status: 'active' as const,
  decidedAt: timestamp,
  removedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
  student: {
    id: 'student-1',
    username: 'student_one',
    faculty: 'BSIT',
  },
}

const pendingEnrollment = {
  ...activeEnrollment,
  id: pendingId,
  studentId: 'student-2',
  status: 'pending' as const,
  decidedAt: null,
  student: {
    id: 'student-2',
    username: 'student_two',
    faculty: 'BSIT',
  },
}

const workspace = {
  course,
  pending: [pendingEnrollment],
  active: [activeEnrollment],
}

function renderRoster() {
  return render(
    <MemoryRouter initialEntries={[`/teacher/subjects/${courseId}/students`]}>
      <Routes>
        <Route
          path="/teacher/subjects/:courseId/students"
          element={<StudentRosterPage onOpenAuth={vi.fn()} />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('StudentRosterPage', () => {
  beforeEach(() => {
    Object.values(enrollmentMocks).forEach((mock) => mock.mockReset())
    enrollmentMocks.getCourseEnrollments.mockResolvedValue(workspace)
    enrollmentMocks.updateEnrollmentSettings.mockResolvedValue({
      ...workspace,
      course: { ...course, enrollmentOpen: false, enrollmentMode: 'auto' },
    })
    enrollmentMocks.approveEnrollment.mockResolvedValue({
      ...workspace,
      pending: [],
      active: [activeEnrollment, { ...pendingEnrollment, status: 'active' }],
    })
    enrollmentMocks.rejectEnrollment.mockResolvedValue({
      ...workspace,
      pending: [],
    })
    enrollmentMocks.removeEnrollment.mockResolvedValue({
      ...workspace,
      pending: [],
      active: [],
    })
  })

  it('shows pending requests and enrolled students', async () => {
    renderRoster()

    expect(
      await screen.findByRole('heading', {
        name: 'Students in Web Systems',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('@student_two')).toBeInTheDocument()
    expect(screen.getByText('@student_one')).toBeInTheDocument()
  })

  it('saves enrollment settings', async () => {
    const user = userEvent.setup()
    renderRoster()

    await user.click(
      await screen.findByRole('switch', { name: 'Open enrollment' }),
    )
    await user.click(screen.getByRole('radio', { name: /auto-accept/i }))
    await user.click(
      screen.getByRole('button', { name: 'Save settings' }),
    )

    await waitFor(() => {
      expect(enrollmentMocks.updateEnrollmentSettings).toHaveBeenCalledWith(
        courseId,
        { open: false, mode: 'auto' },
        'test-token',
      )
    })
  })

  it('approves a pending request', async () => {
    const user = userEvent.setup()
    renderRoster()

    await user.click(
      await screen.findByRole('button', { name: 'Approve' }),
    )

    await waitFor(() => {
      expect(enrollmentMocks.approveEnrollment).toHaveBeenCalledWith(
        pendingId,
        'test-token',
      )
    })
  })

  it('links enrolled students to their quiz results', async () => {
    renderRoster()

    const activeSection = await screen.findByRole('region', {
      name: 'Enrolled students',
    })
    const resultsLink = within(activeSection).getByRole('link', {
      name: 'Results',
    })

    expect(resultsLink).toHaveAttribute(
      'href',
      `/teacher/subjects/${courseId}/students/student-1/results`,
    )
  })

  it('removes an enrolled student', async () => {
    const user = userEvent.setup()
    renderRoster()

    const activeSection = await screen.findByRole('region', {
      name: 'Enrolled students',
    })
    await user.click(
      within(activeSection).getByRole('button', { name: 'Remove' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Remove student?' }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Remove student' }),
    )

    await waitFor(() => {
      expect(enrollmentMocks.removeEnrollment).toHaveBeenCalledWith(
        activeId,
        'test-token',
      )
    })
  })
})
