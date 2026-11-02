import { useEffect, useState } from 'react'
import { CircleAlert, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'
import { ApiError } from '../../services/apiClient'
import {
  ensureQuiz,
  getQuizWorkspace,
} from '../../services/quizService'
import type { Quiz, QuizMode } from '../../types/quiz'
import { DocumentQuizEditor } from './DocumentQuizEditor'
import { NativeQuizEditor } from './NativeQuizEditor'
import { QuizModeChoice } from './QuizModeChoice'

type QuizEditorPanelProps = {
  topicId: string
  accessToken: string
  isActive: boolean
  onDirtyChange: (dirty: boolean) => void
}

function QuizSkeleton() {
  return (
    <div aria-busy="true">
      <div className="h-14 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <div className="mt-md h-72 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <span className="sr-only">Loading quiz</span>
    </div>
  )
}

export function QuizEditorPanel({
  topicId,
  accessToken,
  isActive,
  onDirtyChange,
}: QuizEditorPanelProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    if (!isActive || hasLoaded) {
      return
    }

    let cancelled = false
    setIsLoading(true)
    setLoadError(null)

    void getQuizWorkspace(topicId, accessToken)
      .then((workspace) => {
        if (!cancelled) {
          setQuiz(workspace.quiz)
          setHasLoaded(true)
          onDirtyChange(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('We could not load this quiz. Try again.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, hasLoaded, isActive, onDirtyChange, reloadKey, topicId])

  const chooseMode = async (mode: QuizMode) => {
    setIsCreating(true)
    setCreateError(null)

    try {
      const created = await ensureQuiz(topicId, mode, accessToken)
      setQuiz(created)
      setHasLoaded(true)
      onDirtyChange(false)
    } catch (error) {
      setCreateError(
        error instanceof ApiError
          ? error.message
          : 'We could not create this quiz. Try again.',
      )
    } finally {
      setIsCreating(false)
    }
  }

  if (!isActive && !hasLoaded) {
    return null
  }

  if (isLoading) {
    return <QuizSkeleton />
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-accent-orange-deep/30 bg-surface p-lg"
      >
        <CircleAlert
          className="size-5 text-accent-orange-deep"
          aria-hidden="true"
        />
        <p className="mt-xs text-body-sm text-ink">{loadError}</p>
        <Button
          variant="utility"
          className="mt-sm"
          onClick={() => {
            setLoadError(null)
            setReloadKey((key) => key + 1)
          }}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      </div>
    )
  }

  if (!quiz) {
    return (
      <QuizModeChoice
        isCreating={isCreating}
        error={createError}
        onChoose={(mode) => void chooseMode(mode)}
      />
    )
  }

  if (quiz.mode === 'native') {
    return (
      <NativeQuizEditor
        key={quiz.id}
        quiz={quiz}
        accessToken={accessToken}
        onUpdated={setQuiz}
        onDeleted={() => {
          setQuiz(null)
          onDirtyChange(false)
        }}
        onDirtyChange={onDirtyChange}
      />
    )
  }

  return (
    <DocumentQuizEditor
      key={quiz.id}
      quiz={quiz}
      accessToken={accessToken}
      onUpdated={setQuiz}
      onDeleted={() => {
        setQuiz(null)
        onDirtyChange(false)
      }}
      onDirtyChange={onDirtyChange}
    />
  )
}
