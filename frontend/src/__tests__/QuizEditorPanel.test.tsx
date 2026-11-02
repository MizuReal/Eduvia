import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuizEditorPanel } from '../components/quiz/QuizEditorPanel'

const quizMocks = vi.hoisted(() => ({
  getQuizWorkspace: vi.fn(),
  ensureQuiz: vi.fn(),
}))

vi.mock('../services/quizService', () => quizMocks)

vi.mock('../components/quiz/NativeQuizEditor', () => ({
  NativeQuizEditor: () => <p>Native quiz editor</p>,
}))

vi.mock('../components/quiz/DocumentQuizEditor', () => ({
  DocumentQuizEditor: () => <p>Uploaded paper editor</p>,
}))

const topicId = '11111111-1111-4111-8111-111111111111'

const nativeQuiz = {
  id: '22222222-2222-4222-8222-222222222222',
  courseId: 'c7c39a20-96a2-4c7e-9d29-37b60a8d9ae8',
  topicId,
  mode: 'native' as const,
  title: 'HTML quiz',
  instructions: '',
  passingScore: 75,
  status: 'draft' as const,
  version: 1,
  file: null,
  questions: [],
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
}

const documentQuiz = {
  ...nativeQuiz,
  mode: 'document' as const,
  title: 'Uploaded quiz',
}

describe('QuizEditorPanel', () => {
  beforeEach(() => {
    Object.values(quizMocks).forEach((mock) => mock.mockReset())
    quizMocks.getQuizWorkspace.mockResolvedValue({
      topic: { id: topicId, title: 'HTML', courseId: 'course' },
      quiz: null,
    })
    quizMocks.ensureQuiz.mockResolvedValue(nativeQuiz)
  })

  it('shows the mode choice when the topic has no quiz', async () => {
    render(
      <QuizEditorPanel
        topicId={topicId}
        accessToken="test-token"
        isActive
        onDirtyChange={vi.fn()}
      />,
    )

    expect(
      await screen.findByRole('heading', { name: 'Create the topic quiz' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /build a quiz/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /upload a quiz paper/i }),
    ).toBeInTheDocument()
  })

  it('creates and opens the native editor', async () => {
    const user = userEvent.setup()
    render(
      <QuizEditorPanel
        topicId={topicId}
        accessToken="test-token"
        isActive
        onDirtyChange={vi.fn()}
      />,
    )

    await user.click(
      await screen.findByRole('button', { name: /build a quiz/i }),
    )

    await waitFor(() => {
      expect(quizMocks.ensureQuiz).toHaveBeenCalledWith(
        topicId,
        'native',
        'test-token',
      )
    })
    expect(await screen.findByText('Native quiz editor')).toBeInTheDocument()
  })

  it('opens the uploaded-paper editor', async () => {
    quizMocks.getQuizWorkspace.mockResolvedValue({
      topic: { id: topicId, title: 'HTML', courseId: 'course' },
      quiz: documentQuiz,
    })

    render(
      <QuizEditorPanel
        topicId={topicId}
        accessToken="test-token"
        isActive
        onDirtyChange={vi.fn()}
      />,
    )

    expect(
      await screen.findByText('Uploaded paper editor'),
    ).toBeInTheDocument()
  })

  it('does not load until the tab is active', async () => {
    render(
      <QuizEditorPanel
        topicId={topicId}
        accessToken="test-token"
        isActive={false}
        onDirtyChange={vi.fn()}
      />,
    )

    expect(screen.queryByText('Create the topic quiz')).not.toBeInTheDocument()
    expect(quizMocks.getQuizWorkspace).not.toHaveBeenCalled()
  })

  it('retries after a load failure', async () => {
    const user = userEvent.setup()
    quizMocks.getQuizWorkspace
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce({
        topic: { id: topicId, title: 'HTML', courseId: 'course' },
        quiz: null,
      })

    render(
      <QuizEditorPanel
        topicId={topicId}
        accessToken="test-token"
        isActive
        onDirtyChange={vi.fn()}
      />,
    )

    expect(
      await screen.findByText(/could not load this quiz/i),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(
      await screen.findByRole('heading', { name: 'Create the topic quiz' }),
    ).toBeInTheDocument()
    expect(quizMocks.getQuizWorkspace).toHaveBeenCalledTimes(2)
  })
})
