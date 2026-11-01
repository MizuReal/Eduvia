import { CircleAlert, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ApiError } from '../../services/apiClient'
import {
  getTrash,
  restoreLesson,
  restoreTopic,
} from '../../services/courseOutlineService'
import type {
  CourseTopic,
  CourseTrash,
  Lesson,
} from '../../types/courseOutline'
import { FormAlert } from '../auth/FormAlert'
import { Button } from '../ui/Button'

export type RestoredItem =
  { kind: 'topic'; topic: CourseTopic } | { kind: 'lesson'; lesson: Lesson }

type TrashPanelProps = {
  courseId: string
  accessToken: string
  onRestored: (item: RestoredItem) => void
}

export function TrashPanel({
  courseId,
  accessToken,
  onRestored,
}: TrashPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [trash, setTrash] = useState<CourseTrash | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    let cancelled = false
    setIsLoading(true)
    setLoadError(null)

    void getTrash(courseId, accessToken)
      .then((nextTrash) => {
        if (!cancelled) {
          setTrash(nextTrash)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('We could not load deleted items. Try again.')
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
  }, [accessToken, courseId, isOpen, reloadKey])

  const handleRestore = async (
    kind: 'topic' | 'lesson',
    id: string,
    title: string,
  ) => {
    if (restoringId) {
      return
    }

    setRestoringId(id)
    setActionError(null)
    setActionMessage(null)

    try {
      if (kind === 'topic') {
        const restored = await restoreTopic(id, accessToken)
        onRestored({ kind: 'topic', topic: restored })
      } else {
        const restored = await restoreLesson(id, accessToken)
        onRestored({ kind: 'lesson', lesson: restored })
      }

      setActionMessage(
        kind === 'topic'
          ? `Topic “${title}” restored.`
          : `Lesson “${title}” restored.`,
      )
      setReloadKey((key) => key + 1)
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : 'Something went wrong. Try again.',
      )
    } finally {
      setRestoringId(null)
    }
  }

  const total = trash ? trash.topics.length + trash.lessons.length : null

  return (
    <details
      className="mt-xl rounded-lg border border-hairline bg-surface"
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer px-lg py-md text-title text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        Deleted items
        {total !== null && (
          <span className="ml-xs rounded-full border border-hairline bg-canvas-soft px-xs py-xxs text-eyebrow text-ink-muted">
            {total}
          </span>
        )}
      </summary>

      <div className="border-t border-hairline px-lg py-md">
        <FormAlert message={actionError} />

        {actionMessage && (
          <p
            role="status"
            aria-live="polite"
            className="mb-md rounded-md border border-accent-green/30 bg-canvas-soft p-sm text-body-sm text-ink"
          >
            {actionMessage}
          </p>
        )}

        {isLoading && (
          <div aria-busy="true" className="space-y-xs">
            <div className="h-12 animate-pulse rounded-md bg-canvas-soft motion-reduce:animate-none" />
            <div className="h-12 animate-pulse rounded-md bg-canvas-soft motion-reduce:animate-none" />
            <span className="sr-only">Loading deleted items</span>
          </div>
        )}

        {!isLoading && loadError && (
          <div role="alert" className="rounded-md bg-canvas-soft p-md">
            <div className="flex items-start gap-xs">
              <CircleAlert
                className="mt-xxs size-4 shrink-0 text-accent-orange-deep"
                aria-hidden="true"
              />
              <p className="text-body-sm text-ink">{loadError}</p>
            </div>
            <Button
              variant="utility"
              className="mt-sm"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !loadError && trash && total === 0 && (
          <div className="rounded-md bg-canvas-soft p-md text-center">
            <Trash2
              className="mx-auto size-6 text-ink-faint"
              aria-hidden="true"
            />
            <p className="mt-xxs text-body-sm text-ink-muted">
              No deleted topics or lessons.
            </p>
          </div>
        )}

        {!isLoading && !loadError && trash && total !== 0 && (
          <div className="space-y-md">
            {trash.topics.length > 0 && (
              <section aria-labelledby="deleted-topics-heading">
                <h3 id="deleted-topics-heading" className="text-title text-ink">
                  Deleted topics
                </h3>
                <ul className="mt-xs flex flex-col gap-xs">
                  {trash.topics.map((topic) => (
                    <li
                      key={topic.id}
                      className="flex flex-wrap items-center justify-between gap-sm rounded-md bg-canvas-soft p-sm"
                    >
                      <div>
                        <p className="text-body-sm text-ink">{topic.title}</p>
                        <p className="text-caption text-ink-muted">
                          {topic.lessonCount}{' '}
                          {topic.lessonCount === 1 ? 'lesson' : 'lessons'} will
                          be restored with it.
                        </p>
                      </div>
                      <Button
                        variant="utility"
                        disabled={restoringId !== null}
                        onClick={() =>
                          void handleRestore('topic', topic.id, topic.title)
                        }
                      >
                        <RotateCcw className="size-4" aria-hidden="true" />
                        {restoringId === topic.id ? 'Restoring…' : 'Restore'}
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {trash.lessons.length > 0 && (
              <section aria-labelledby="deleted-lessons-heading">
                <h3
                  id="deleted-lessons-heading"
                  className="text-title text-ink"
                >
                  Deleted lessons
                </h3>
                <ul className="mt-xs flex flex-col gap-xs">
                  {trash.lessons.map((lesson) => (
                    <li
                      key={lesson.id}
                      className="flex flex-wrap items-center justify-between gap-sm rounded-md bg-canvas-soft p-sm"
                    >
                      <div>
                        <p className="text-body-sm text-ink">{lesson.title}</p>
                        <p className="text-caption text-ink-muted">
                          {lesson.topicTitle}
                          {!lesson.restorable && ' · Restore its topic first.'}
                        </p>
                      </div>
                      <Button
                        variant="utility"
                        disabled={restoringId !== null || !lesson.restorable}
                        onClick={() =>
                          void handleRestore('lesson', lesson.id, lesson.title)
                        }
                      >
                        <RotateCcw className="size-4" aria-hidden="true" />
                        {restoringId === lesson.id ? 'Restoring…' : 'Restore'}
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </details>
  )
}
