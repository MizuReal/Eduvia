import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StudentQuizPage } from '../pages/StudentQuizPage'

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
  },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState.current,
}))

const contentMocks = vi.hoisted(() => ({
  getStudentTopicContent: vi.fn(),
}))

vi.mock('../services/studentContentService', () => contentMocks)

const learningMocks = vi.hoisted(() => ({
  startQuizAttempt: vi.fn(),
  saveAttemptAnswers: vi.fn(),
  submitAttempt: vi.fn(),
}))

vi.mock('../services/learningService', () => learningMocks)

const courseId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const topicId = '11111111-1111-4111-8111-111111111111'
const quizId = '22222222-2222-4222-8222-222222222222'
const attemptId = '33333333-3333-4333-8333-333333333333'

const questions = [
  {
    id: '44444444-4444-4444-8444-444444444444',
    orderIndex: 0,
    prompt: 'What is HTML?',
    optionA: 'Markup',
    optionB: 'Database',
    optionC: 'Server',
    optionD: 'Network',
    points: 1,
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    orderIndex: 1,
    prompt: 'What is CSS?',
    optionA: 'Styling',
    optionB: 'Database',
    optionC: 'Server',
    optionD: 'Network',
    points: 1,
  },
]

const topicContent = {
  topic: {
    id: topicId,
    title: 'HTML foundations',
    courseId,
  },
  slides: null,
  upload: null,
  summary: 'HTML and CSS basics.',
  progress: {
    presentationHighestSlideIndex: 0,
    slidesHighestSlideIndex: -1,
    presentationCompleted: true,
    slidesCompleted: false,
    completed: true,
  },
  quiz: {
    id: quizId,
    title: 'HTML quiz',
    mode: 'native' as const,
    questionCount: 2,
    passingScore: 75,
  },
  status: 'ready' as const,
  latestAttempt: null,
  locked: false,
  nextTopicId: null,
}

const attempt = {
  id: attemptId,
  quizId,
  topicId,
  attemptNumber: 1,
  status: 'in_progress' as const,
  quiz: {
    title: 'HTML quiz',
    instructions: 'Choose the best answer.',
    passingScore: 75,
    mode: 'native' as const,
  },
  questions,
  answers: [],
  paper: null,
  result: null,
}

const gradedAttempt = {
  ...attempt,
  status: 'graded' as const,
  answers: [
    { questionId: questions[0]?.id ?? '', selectedOption: 'A' as const },
    { questionId: questions[1]?.id ?? '', selectedOption: 'A' as const },
  ],
  result: {
    score: 2,
    maxScore: 2,
    percentage: 100,
    passed: true,
    answers: [
      {
        questionId: questions[0]?.id ?? '',
        selectedOption: 'A' as const,
        correctOption: 'A' as const,
        isCorrect: true,
        pointsAwarded: 1,
      },
      {
        questionId: questions[1]?.id ?? '',
        selectedOption: 'A' as const,
        correctOption: 'A' as const,
        isCorrect: true,
        pointsAwarded: 1,
      },
    ],
  },
}

const failedAttempt = {
  ...gradedAttempt,
  answers: [
    { questionId: questions[0]?.id ?? '', selectedOption: 'B' as const },
    { questionId: questions[1]?.id ?? '', selectedOption: 'B' as const },
  ],
  result: {
    score: 0,
    maxScore: 2,
    percentage: 0,
    passed: false,
    answers: [
      {
        questionId: questions[0]?.id ?? '',
        selectedOption: 'B' as const,
        correctOption: null,
        isCorrect: false,
        pointsAwarded: 0,
      },
      {
        questionId: questions[1]?.id ?? '',
        selectedOption: 'B' as const,
        correctOption: null,
        isCorrect: false,
        pointsAwarded: 0,
      },
    ],
  },
}

function renderQuiz() {
  return render(
    <MemoryRouter
      initialEntries={[`/student/subjects/${courseId}/topics/${topicId}/quiz`]}
    >
      <Routes>
        <Route
          path="/student/subjects/:courseId/topics/:topicId/quiz"
          element={<StudentQuizPage onOpenAuth={vi.fn()} />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('StudentQuizPage', () => {
  beforeEach(() => {
    Object.values(contentMocks).forEach((mock) => mock.mockReset())
    Object.values(learningMocks).forEach((mock) => mock.mockReset())
    contentMocks.getStudentTopicContent.mockResolvedValue(topicContent)
    learningMocks.startQuizAttempt.mockResolvedValue(attempt)
    learningMocks.saveAttemptAnswers.mockResolvedValue(attempt)
    learningMocks.submitAttempt.mockResolvedValue(gradedAttempt)
  })

  it('autosaves answers and submits the quiz', async () => {
    const user = userEvent.setup()
    renderQuiz()

    expect(
      await screen.findByRole('heading', { name: 'HTML quiz' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Markup')).toBeInTheDocument()
    expect(screen.getByText('Styling')).toBeInTheDocument()

    const firstQuestion = screen.getByText('1. What is HTML?').closest('li')
    const secondQuestion = screen.getByText('2. What is CSS?').closest('li')

    expect(firstQuestion).not.toBeNull()
    expect(secondQuestion).not.toBeNull()

    if (!firstQuestion || !secondQuestion) {
      throw new Error('Question cards were not rendered.')
    }

    await user.click(within(firstQuestion).getByRole('radio', { name: /A\./ }))
    await user.click(within(secondQuestion).getByRole('radio', { name: /A\./ }))

    await waitFor(() => {
      expect(learningMocks.saveAttemptAnswers).toHaveBeenCalled()
    })

    await user.click(screen.getByRole('button', { name: 'Submit quiz' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(
      within(dialog).getByRole('button', { name: 'Submit quiz' }),
    )

    await waitFor(() => {
      expect(learningMocks.submitAttempt).toHaveBeenCalledWith(
        attemptId,
        'test-token',
      )
    })
    expect(
      await screen.findByRole('heading', { name: 'Congratulations!' }),
    ).toBeInTheDocument()
  })

  it('hides correct answers after a failed attempt', async () => {
    const user = userEvent.setup()
    learningMocks.submitAttempt.mockResolvedValue(failedAttempt)
    renderQuiz()

    const firstQuestion = (await screen.findByText('1. What is HTML?')).closest(
      'li',
    )
    const secondQuestion = screen.getByText('2. What is CSS?').closest('li')

    if (!firstQuestion || !secondQuestion) {
      throw new Error('Question cards were not rendered.')
    }

    await user.click(within(firstQuestion).getByRole('radio', { name: /B\./ }))
    await user.click(within(secondQuestion).getByRole('radio', { name: /B\./ }))
    await user.click(screen.getByRole('button', { name: 'Submit quiz' }))

    const dialog = await screen.findByRole('alertdialog')
    await user.click(
      within(dialog).getByRole('button', { name: 'Submit quiz' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Not passed yet' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/correct answers stay hidden until you pass/i),
    ).toBeInTheDocument()
    expect(screen.queryByText('Answer review')).not.toBeInTheDocument()
    expect(screen.queryByText(/Correct answer:/)).not.toBeInTheDocument()
  })
})
