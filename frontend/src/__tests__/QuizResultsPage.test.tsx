import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuizResultsPage } from '../pages/QuizResultsPage'

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
const topicId = '11111111-1111-4111-8111-111111111111'
const timestamp = '2026-11-02T00:00:00.000Z'

const results = {
  topic: {
    id: topicId,
    title: 'HTML foundations',
  },
  quiz: {
    id: '33333333-3333-4333-8333-333333333333',
    title: 'HTML quiz',
    mode: 'native' as const,
    status: 'published' as const,
    version: 2,
    passingScore: 75,
  },
  rows: [
    {
      studentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      username: 'zoe',
      faculty: 'BSIT' as const,
      attempts: 2,
      bestScore: 4,
      maxScore: 5,
      percentage: 80,
      status: 'passed' as const,
      lastSubmittedAt: timestamp,
    },
    {
      studentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      username: 'amy',
      faculty: 'BSEE' as const,
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
        `/teacher/subjects/${courseId}/topics/${topicId}/results`,
      ]}
    >
      <Routes>
        <Route
          path="/teacher/subjects/:courseId/topics/:topicId/results"
          element={<QuizResultsPage onOpenAuth={vi.fn()} />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('QuizResultsPage', () => {
  beforeEach(() => {
    resultsMocks.getTopicQuizResults.mockReset()
    resultsMocks.getStudentQuizResults.mockReset()
    resultsMocks.getTopicQuizResults.mockResolvedValue(results)
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:test'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('shows every active student with not-taken rows and result counts', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'HTML foundations' }),
    ).toBeInTheDocument()
    expect(screen.getByText('@amy')).toBeInTheDocument()
    expect(screen.getByText('@zoe')).toBeInTheDocument()
    const tableRegion = screen.getByRole('region', {
      name: 'Quiz results table',
    })
    expect(within(tableRegion).getByText('Not taken')).toBeInTheDocument()
    expect(within(tableRegion).getByText('Passed')).toBeInTheDocument()
    expect(screen.getByText('of 2 enrolled')).toBeInTheDocument()
  })

  it('sorts by username first and by score on demand', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('@amy')
    const bodyRows = () => screen.getAllByRole('row').slice(1)

    expect(
      within(bodyRows()[0] as HTMLElement).getByText('@amy'),
    ).toBeInTheDocument()
    expect(
      within(bodyRows()[1] as HTMLElement).getByText('@zoe'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Score' }))

    await waitFor(() => {
      expect(
        within(screen.getAllByRole('row')[1] as HTMLElement).getByText('@zoe'),
      ).toBeInTheDocument()
    })
  })

  it('exports the sorted rows as CSV', async () => {
    const user = userEvent.setup()
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    renderPage()

    await screen.findByText('@amy')
    await user.click(screen.getByRole('button', { name: 'Export CSV' }))

    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })

  it('opens the print dialog for the PDF export', async () => {
    const user = userEvent.setup()
    const printSpy = vi
      .spyOn(window, 'print')
      .mockImplementation(() => undefined)
    renderPage()

    await screen.findByText('@amy')
    await user.click(screen.getByRole('button', { name: 'Print / PDF' }))

    expect(printSpy).toHaveBeenCalled()
    printSpy.mockRestore()
  })

  it('offers to create a quiz when the topic has none', async () => {
    resultsMocks.getTopicQuizResults.mockResolvedValue({
      topic: results.topic,
      quiz: null,
      rows: [],
    })
    renderPage()

    expect(
      await screen.findByRole('heading', {
        name: 'No quiz for this topic yet',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Make a quiz' })).toHaveAttribute(
      'href',
      `/teacher/subjects/${courseId}/topics/${topicId}?tab=quiz`,
    )
  })

  it('explains that a draft quiz has no results yet', async () => {
    resultsMocks.getTopicQuizResults.mockResolvedValue({
      ...results,
      quiz: { ...results.quiz, status: 'draft' },
      rows: [],
    })
    renderPage()

    expect(
      await screen.findByRole('heading', {
        name: 'This quiz is still a draft',
      }),
    ).toBeInTheDocument()
  })
})
