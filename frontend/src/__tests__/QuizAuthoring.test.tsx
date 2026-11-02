import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DocumentQuizEditor } from '../components/quiz/DocumentQuizEditor'
import { NativeQuizEditor } from '../components/quiz/NativeQuizEditor'
import { ToastProvider } from '../components/ui/ToastProvider'
import type { Quiz } from '../types/quiz'
import type { ReactNode } from 'react'

const quizMocks = vi.hoisted(() => ({
  saveQuiz: vi.fn(),
  publishQuiz: vi.fn(),
  deleteQuiz: vi.fn(),
  uploadQuizPaper: vi.fn(),
  removeQuizPaper: vi.fn(),
}))

vi.mock('../services/quizService', () => quizMocks)

const timestamp = '2026-11-02T00:00:00.000Z'
const quizId = '22222222-2222-4222-8222-222222222222'

function nativeQuestion(index: number) {
  return {
    id: `33333333-3333-4333-8333-33333333333${index % 10}`,
    orderIndex: index,
    prompt: `Question ${index + 1}`,
    optionA: 'Option A',
    optionB: 'Option B',
    optionC: 'Option C',
    optionD: 'Option D',
    correctOption: 'A' as const,
    explanation: null,
    points: 1,
  }
}

function buildQuiz(overrides: Partial<Quiz> = {}): Quiz {
  return {
    id: quizId,
    courseId: 'c7c39a20-96a2-4c7e-9d29-37b60a8d9ae8',
    topicId: '11111111-1111-4111-8111-111111111111',
    mode: 'native',
    title: 'HTML quiz',
    instructions: '',
    passingScore: 75,
    status: 'draft',
    version: 1,
    file: null,
    questions: Array.from({ length: 10 }, (_, index) => nativeQuestion(index)),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  }
}

describe('quiz authoring forms', () => {
  function renderEditor(editor: ReactNode) {
    return render(<ToastProvider>{editor}</ToastProvider>)
  }

  beforeEach(() => {
    Object.values(quizMocks).forEach((mock) => mock.mockReset())
    quizMocks.saveQuiz.mockImplementation((_id, input) =>
      Promise.resolve(buildQuiz({ title: input.title })),
    )
    quizMocks.publishQuiz.mockResolvedValue(
      buildQuiz({ status: 'published', version: 2 }),
    )
  })

  it('saves native questions with their correct options', async () => {
    const user = userEvent.setup()
    const onUpdated = vi.fn()

    renderEditor(
      <NativeQuizEditor
        quiz={buildQuiz()}
        accessToken="test-token"
        onUpdated={onUpdated}
        onDeleted={vi.fn()}
        onDirtyChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(quizMocks.saveQuiz).toHaveBeenCalledWith(
        quizId,
        expect.objectContaining({
          title: 'HTML quiz',
          passingScore: 75,
          questions: expect.arrayContaining([
            expect.objectContaining({
              prompt: 'Question 1',
              optionA: 'Option A',
              correctOption: 'A',
            }),
          ]),
        }),
        'test-token',
      )
    })
    expect(onUpdated).toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Quiz saved.')
  })

  it('adds a native question before saving', async () => {
    const user = userEvent.setup()

    renderEditor(
      <NativeQuizEditor
        quiz={buildQuiz()}
        accessToken="test-token"
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onDirtyChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /add question/i }))
    const cards = screen.getAllByRole('listitem')
    const lastCard = cards[cards.length - 1]

    expect(lastCard).toBeDefined()

    if (!lastCard) {
      throw new Error('Expected the new question card.')
    }

    await user.type(within(lastCard).getByLabelText('Question'), 'New question')
    await user.type(within(lastCard).getByLabelText('Option A'), 'First')
    await user.type(within(lastCard).getByLabelText('Option B'), 'Second')
    await user.type(within(lastCard).getByLabelText('Option C'), 'Third')
    await user.type(within(lastCard).getByLabelText('Option D'), 'Fourth')
    await user.click(within(lastCard).getByRole('radio', { name: 'D' }))

    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(quizMocks.saveQuiz).toHaveBeenCalled()
    })

    const payload = quizMocks.saveQuiz.mock.calls[0]?.[1] as {
      questions: unknown[]
    }

    expect(payload.questions).toHaveLength(11)
  })

  it('blocks publishing a native quiz with fewer than 10 questions', async () => {
    const user = userEvent.setup()
    quizMocks.saveQuiz.mockResolvedValue(buildQuiz({ questions: [] }))

    renderEditor(
      <NativeQuizEditor
        quiz={buildQuiz({ questions: [] })}
        accessToken="test-token"
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onDirtyChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^publish$/i }))

    expect(
      await screen.findByText(
        /a quiz must have between 10 and 20 questions to publish/i,
      ),
    ).toBeInTheDocument()
    expect(quizMocks.publishQuiz).not.toHaveBeenCalled()
  })

  it('requires every answer-key row before saving', async () => {
    const user = userEvent.setup()

    renderEditor(
      <DocumentQuizEditor
        quiz={buildQuiz({ mode: 'document', questions: [] })}
        accessToken="test-token"
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onDirtyChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(
      await screen.findAllByText('Choose the correct answer.'),
    ).toHaveLength(10)
    expect(quizMocks.saveQuiz).not.toHaveBeenCalled()
  })

  it('saves a complete A-D answer key', async () => {
    const user = userEvent.setup()

    renderEditor(
      <DocumentQuizEditor
        quiz={buildQuiz({
          mode: 'document',
          title: 'Uploaded quiz',
          questions: [],
        })}
        accessToken="test-token"
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onDirtyChange={vi.fn()}
      />,
    )

    const optionAButtons = screen.getAllByRole('radio', { name: 'A' })

    expect(optionAButtons).toHaveLength(10)

    for (const button of optionAButtons) {
      await user.click(button)
    }

    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(quizMocks.saveQuiz).toHaveBeenCalledWith(
        quizId,
        expect.objectContaining({
          title: 'Uploaded quiz',
          answers: Array.from({ length: 10 }, () => 'A'),
        }),
        'test-token',
      )
    })
    expect(screen.getByRole('status')).toHaveTextContent('Quiz saved.')
  })
})
