import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StudentResultsPage } from '../pages/StudentResultsPage'

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

const resultsMocks = vi.hoisted(() => ({
  getTopicQuizResults: vi.fn(),
  getStudentQuizResults: vi.fn(),
}))

vi.mock('../services/quizResultsService', () => resultsMocks)

const courseId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const studentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const timestamp = '2026-11-02T00:00:00.000Z'

const results = {
  course: {
    id: courseId,
    name: 'Web Systems',
    code: 'WEB101',
    term: 'first_trimester' as const,
    yearLevel: 2 as const,
    enrollmentOpen: true,
    enrollmentMode: 'approval' as const,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  student: {
    id: studentId,
    username: 'zoe',
    faculty: 'BSIT' as const,
  },
  rows: [
    {
      topicId: '11111111-1111-4111-8111-111111111111',
      topicTitle: 'HTML foundations',
      topicOrderIndex: 0,
      quizId: '22222222-2222-4222-8222-222222222222',
      quizTitle: 'HTML quiz',
      quizMode: 'native' as const,
      passingScore: 75,
      attempts: 1,
      bestScore: 9,
      maxScore: 10,
      percentage: 90,
      status: 'passed' as const,
      lastSubmittedAt: timestamp,
    },
    {
      topicId: '33333333-3333-4333-8333-333333333333',
      topicTitle: 'CSS layout',
      topicOrderIndex: 1,
      quizId: '44444444-4444-4444-8444-444444444444',
      quizTitle: 'CSS quiz',
      quizMode: 'native' as const,
      passingScore: 75,
      attempts: 2,
      bestScore: 2,
      maxScore: 10,
      percentage: 40,
      status: 'failed' as const,
      lastSubmittedAt: timestamp,
    },
    {
      topicId: '55555555-5555-4555-8555-555555555555',
      topicTitle: 'JavaScript',
      topicOrderIndex: 2,
      quizId: '66666666-6666-4666-8666-666666666666',
      quizTitle: 'JavaScript quiz',
      quizMode: 'native' as const,
      passingScore: 75,
      attempts: 0,
      bestScore: null,
      maxScore: null,
      percentage: null,
      status: 'not_taken' as const,
      lastSubmittedAt: null,
    },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        `/teacher/subjects/${courseId}/students/${studentId}/results`,
      ]}
    >
      <Routes>
        <Route
          path="/teacher/subjects/:courseId/students/:studentId/results"
          element={<StudentResultsPage onOpenAuth={vi.fn()} />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('StudentResultsPage', () => {
  beforeEach(() => {
    resultsMocks.getTopicQuizResults.mockReset()
    resultsMocks.getStudentQuizResults.mockReset()
    resultsMocks.getStudentQuizResults.mockResolvedValue(results)
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:test'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('shows the student’s quizzes sorted highest to lowest', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { name: /zoe’s quiz results/i }),
    ).toBeInTheDocument()
    const bodyRows = screen.getAllByRole('row').slice(1)

    expect(
      within(bodyRows[0] as HTMLElement).getByText('HTML foundations'),
    ).toBeInTheDocument()
    expect(
      within(bodyRows[1] as HTMLElement).getByText('CSS layout'),
    ).toBeInTheDocument()
    expect(
      within(bodyRows[2] as HTMLElement).getByText('JavaScript'),
    ).toBeInTheDocument()
    const tableRegion = screen.getByRole('region', {
      name: 'Student quiz results table',
    })
    expect(within(tableRegion).getByText('Passed')).toBeInTheDocument()
    expect(within(tableRegion).getByText('Failed')).toBeInTheDocument()
    expect(within(tableRegion).getByText('Not taken')).toBeInTheDocument()
    expect(screen.getByText('of 3 quizzes')).toBeInTheDocument()
  })

  it('lets the teacher sort by topic', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: /zoe’s quiz results/i })
    await user.click(screen.getByRole('button', { name: 'Topic' }))

    expect(
      within(screen.getAllByRole('row')[1] as HTMLElement).getByText(
        'CSS layout',
      ),
    ).toBeInTheDocument()
  })

  it('exports the student summary as CSV', async () => {
    const user = userEvent.setup()
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    renderPage()

    await screen.findByRole('heading', { name: /zoe’s quiz results/i })
    await user.click(screen.getByRole('button', { name: 'Export CSV' }))

    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })

  it('shows an empty state when the subject has no published quizzes', async () => {
    resultsMocks.getStudentQuizResults.mockResolvedValue({
      ...results,
      rows: [],
    })
    renderPage()

    expect(
      await screen.findByRole('heading', {
        name: 'No published quizzes in this subject yet',
      }),
    ).toBeInTheDocument()
  })
})
