import { arrayMove } from '@dnd-kit/sortable'
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  RefreshCw,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Container } from '../components/layout/Container'
import { ConfirmDeleteDialog } from '../components/teacher/ConfirmDeleteDialog'
import { EditLessonDialog } from '../components/teacher/EditLessonDialog'
import { EditTopicDialog } from '../components/teacher/EditTopicDialog'
import { LessonForm } from '../components/teacher/LessonForm'
import { TableOfContents } from '../components/teacher/TableOfContents'
import { TeacherAccessGate } from '../components/teacher/TeacherAccessGate'
import { TopicForm } from '../components/teacher/TopicForm'
import { TrashPanel } from '../components/teacher/TrashPanel'
import type { RestoredItem } from '../components/teacher/TrashPanel'
import { Button } from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import { courseTermLabel, yearLevelLabel } from '../config/course'
import { useAuth } from '../context/AuthContext'
import { FormAlert } from '../components/auth/FormAlert'
import { ApiError } from '../services/apiClient'
import {
  createLesson,
  createTopic,
  deleteLesson,
  deleteTopic,
  getCourseOutline,
  reorderLessons,
  reorderTopics,
  updateLesson,
  updateTopic,
} from '../services/courseOutlineService'
import type { AuthMode } from '../types/auth'
import type {
  CourseOutline,
  CourseTopic,
  CreateLessonInput,
  CreateTopicInput,
  Lesson,
  UpdateLessonInput,
} from '../types/courseOutline'

type CourseOutlinePageProps = {
  onOpenAuth: (mode: AuthMode) => void
}

type EditTarget =
  | { kind: 'topic'; topic: CourseTopic }
  | { kind: 'lesson'; topicId: string; lesson: Lesson }

type DeleteTarget = EditTarget

function OutlineSkeleton() {
  return (
    <div className="mt-xl" aria-busy="true">
      <div className="grid gap-lg md:grid-cols-2">
        <div className="h-72 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
        <div className="h-72 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      </div>
      <div className="mt-lg h-64 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <span className="sr-only">Loading subject outline</span>
    </div>
  )
}

function NotFound() {
  return (
    <div className="mt-xl max-w-card rounded-lg border border-hairline bg-surface p-lg shadow-soft">
      <CircleAlert
        className="size-5 text-accent-orange-deep"
        aria-hidden="true"
      />
      <h2 className="mt-sm text-heading-3">Subject not found</h2>
      <p className="mt-xxs text-body-sm text-ink-muted">
        This subject does not exist or is not available to your account.
      </p>
      <Link
        to="/teacher"
        className="mt-md inline-flex min-h-11 items-center gap-xxs text-body-sm font-medium text-primary transition-colors hover:text-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Back to subjects
      </Link>
    </div>
  )
}

function OutlineError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      className="mt-xl max-w-card rounded-lg border border-accent-orange-deep/30 bg-surface p-lg"
    >
      <CircleAlert
        className="size-5 text-accent-orange-deep"
        aria-hidden="true"
      />
      <p className="mt-xs text-body-sm text-ink">{message}</p>
      <Button variant="utility" onClick={onRetry} className="mt-sm">
        <RefreshCw className="size-4" aria-hidden="true" />
        Try again
      </Button>
    </div>
  )
}

export function CourseOutlinePage({ onOpenAuth }: CourseOutlinePageProps) {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [outline, setOutline] = useState<CourseOutline | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const accessToken = session?.access_token

  useEffect(() => {
    if (!courseId || !accessToken) {
      setOutline(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setLoadError(null)
    setNotFound(false)

    void getCourseOutline(courseId, accessToken)
      .then((nextOutline) => {
        if (!cancelled) {
          setOutline(nextOutline)
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        if (
          error instanceof ApiError &&
          (error.code === 'COURSE_NOT_FOUND' || error.status === 404)
        ) {
          setNotFound(true)
          setOutline(null)
          return
        }

        setLoadError('We could not load this subject. Try again.')
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, courseId, reloadKey])

  const handleCreateTopic = useCallback(
    async (input: CreateTopicInput): Promise<CourseTopic> => {
      if (!courseId || !accessToken) {
        throw new ApiError(
          'AUTH_REQUIRED',
          'Sign in again to add a topic.',
          401,
        )
      }

      const topic = await createTopic(courseId, input, accessToken)

      setOutline((current) =>
        current ? { ...current, topics: [...current.topics, topic] } : current,
      )

      return topic
    },
    [accessToken, courseId],
  )

  const handleCreateLesson = useCallback(
    async (input: CreateLessonInput): Promise<Lesson> => {
      if (!courseId || !accessToken) {
        throw new ApiError(
          'AUTH_REQUIRED',
          'Sign in again to add a lesson.',
          401,
        )
      }

      const lesson = await createLesson(courseId, input, accessToken)

      setOutline((current) =>
        current
          ? {
              ...current,
              topics: current.topics.map((topic) =>
                topic.id === input.topicId
                  ? { ...topic, lessons: [...topic.lessons, lesson] }
                  : topic,
              ),
            }
          : current,
      )

      return lesson
    },
    [accessToken, courseId],
  )

  const handleReorderTopics = (topicIds: string[]) => {
    if (!courseId || !accessToken || !outline) {
      return
    }

    const previousTopics = outline.topics
    const topicsById = new Map(previousTopics.map((topic) => [topic.id, topic]))
    const nextTopics = topicIds
      .map((topicId) => topicsById.get(topicId))
      .filter((topic): topic is CourseTopic => Boolean(topic))

    if (nextTopics.length !== previousTopics.length) {
      return
    }

    setActionError(null)
    setActionMessage(null)
    setOutline((current) =>
      current ? { ...current, topics: nextTopics } : current,
    )

    void reorderTopics(courseId, topicIds, accessToken).catch(() => {
      setOutline((current) =>
        current ? { ...current, topics: previousTopics } : current,
      )
      setActionError('We could not reorder the topics. Try again.')
    })
  }

  const handleMoveTopic = (topic: CourseTopic, offset: number) => {
    if (!outline) {
      return
    }

    const index = outline.topics.findIndex((item) => item.id === topic.id)
    const nextIndex = index + offset

    if (index < 0 || nextIndex < 0 || nextIndex >= outline.topics.length) {
      return
    }

    handleReorderTopics(
      arrayMove(outline.topics, index, nextIndex).map((item) => item.id),
    )
  }

  const handleReorderLessons = (topicId: string, lessonIds: string[]) => {
    if (!courseId || !accessToken || !outline) {
      return
    }

    const topic = outline.topics.find((item) => item.id === topicId)

    if (!topic) {
      return
    }

    const previousLessons = topic.lessons
    const lessonsById = new Map(
      previousLessons.map((lesson) => [lesson.id, lesson]),
    )
    const nextLessons = lessonIds
      .map((lessonId) => lessonsById.get(lessonId))
      .filter((lesson): lesson is Lesson => Boolean(lesson))

    if (nextLessons.length !== previousLessons.length) {
      return
    }

    setActionError(null)
    setActionMessage(null)
    setOutline((current) =>
      current
        ? {
            ...current,
            topics: current.topics.map((item) =>
              item.id === topicId ? { ...item, lessons: nextLessons } : item,
            ),
          }
        : current,
    )

    void reorderLessons(topicId, lessonIds, accessToken).catch(() => {
      setOutline((current) =>
        current
          ? {
              ...current,
              topics: current.topics.map((item) =>
                item.id === topicId
                  ? { ...item, lessons: previousLessons }
                  : item,
              ),
            }
          : current,
      )
      setActionError('We could not reorder the lessons. Try again.')
    })
  }

  const handleMoveLesson = (
    topicId: string,
    lesson: Lesson,
    offset: number,
  ) => {
    const topic = outline?.topics.find((item) => item.id === topicId)

    if (!topic) {
      return
    }

    const index = topic.lessons.findIndex((item) => item.id === lesson.id)
    const nextIndex = index + offset

    if (index < 0 || nextIndex < 0 || nextIndex >= topic.lessons.length) {
      return
    }

    handleReorderLessons(
      topicId,
      arrayMove(topic.lessons, index, nextIndex).map((item) => item.id),
    )
  }

  const handleUpdateTopic = async (topic: CourseTopic, title: string) => {
    if (!accessToken) {
      throw new ApiError(
        'AUTH_REQUIRED',
        'Sign in again to update a topic.',
        401,
      )
    }

    const updated = await updateTopic(topic.id, { title }, accessToken)

    setOutline((current) =>
      current
        ? {
            ...current,
            topics: current.topics.map((item) =>
              item.id === updated.id ? { ...item, ...updated } : item,
            ),
          }
        : current,
    )
    setActionError(null)
    setActionMessage('Topic updated.')
  }

  const handleDeleteTopic = async (topic: CourseTopic) => {
    if (!accessToken) {
      throw new ApiError(
        'AUTH_REQUIRED',
        'Sign in again to delete a topic.',
        401,
      )
    }

    await deleteTopic(topic.id, accessToken)

    setOutline((current) =>
      current
        ? {
            ...current,
            topics: current.topics.filter((item) => item.id !== topic.id),
          }
        : current,
    )
    setActionError(null)
    setActionMessage('Topic deleted. It is now in Deleted items.')
  }

  const handleUpdateLesson = async (
    topicId: string,
    lesson: Lesson,
    input: UpdateLessonInput,
  ) => {
    if (!accessToken) {
      throw new ApiError(
        'AUTH_REQUIRED',
        'Sign in again to update a lesson.',
        401,
      )
    }

    const updated = await updateLesson(lesson.id, input, accessToken)

    setOutline((current) => {
      if (!current) {
        return current
      }

      if (input.topicId === topicId) {
        return {
          ...current,
          topics: current.topics.map((topic) =>
            topic.id === topicId
              ? {
                  ...topic,
                  lessons: topic.lessons.map((item) =>
                    item.id === updated.id ? updated : item,
                  ),
                }
              : topic,
          ),
        }
      }

      return {
        ...current,
        topics: current.topics.map((topic) => {
          const withoutLesson = topic.lessons.filter(
            (item) => item.id !== updated.id,
          )

          return topic.id === updated.topicId
            ? { ...topic, lessons: [...withoutLesson, updated] }
            : { ...topic, lessons: withoutLesson }
        }),
      }
    })
    setActionError(null)
    setActionMessage('Lesson updated.')
  }

  const handleDeleteLesson = async (topicId: string, lesson: Lesson) => {
    if (!accessToken) {
      throw new ApiError(
        'AUTH_REQUIRED',
        'Sign in again to delete a lesson.',
        401,
      )
    }

    await deleteLesson(lesson.id, accessToken)

    setOutline((current) =>
      current
        ? {
            ...current,
            topics: current.topics.map((topic) =>
              topic.id === topicId
                ? {
                    ...topic,
                    lessons: topic.lessons.filter(
                      (item) => item.id !== lesson.id,
                    ),
                  }
                : topic,
            ),
          }
        : current,
    )
    setActionError(null)
    setActionMessage('Lesson deleted. It is now in Deleted items.')
  }

  const handleRestored = (item: RestoredItem) => {
    setOutline((current) => {
      if (!current) {
        return current
      }

      if (item.kind === 'topic') {
        const exists = current.topics.some(
          (topic) => topic.id === item.topic.id,
        )

        return {
          ...current,
          topics: exists
            ? current.topics.map((topic) =>
                topic.id === item.topic.id ? item.topic : topic,
              )
            : [...current.topics, item.topic],
        }
      }

      return {
        ...current,
        topics: current.topics.map((topic) =>
          topic.id === item.lesson.topicId
            ? { ...topic, lessons: [...topic.lessons, item.lesson] }
            : topic,
        ),
      }
    })
  }

  const handleRetry = () => {
    setReloadKey((key) => key + 1)
  }

  const clearActionFeedback = () => {
    setActionError(null)
    setActionMessage(null)
  }

  const openTopic = (topic: CourseTopic, tab?: 'quiz') => {
    clearActionFeedback()

    if (courseId) {
      navigate(
        `/teacher/subjects/${courseId}/topics/${topic.id}${
          tab ? `?tab=${tab}` : ''
        }`,
      )
    }
  }

  const openTopicResults = (topic: CourseTopic) => {
    clearActionFeedback()

    if (courseId) {
      navigate(`/teacher/subjects/${courseId}/topics/${topic.id}/results`)
    }
  }

  return (
    <section
      aria-labelledby="course-outline-heading"
      className="py-xl lg:py-section"
    >
      <Container>
        <Link
          to="/teacher"
          className="inline-flex min-h-11 items-center gap-xxs text-body-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All subjects
        </Link>

        <div className="mt-md flex flex-wrap items-start justify-between gap-md">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full bg-surface px-xs py-xxs text-eyebrow text-primary shadow-soft">
              {outline?.code ?? 'Subject outline'}
            </span>
            <h1
              id="course-outline-heading"
              className="mt-md text-heading-2 sm:text-heading-1"
            >
              {outline?.name ?? 'Subject outline'}
            </h1>
            {outline && (
              <p className="mt-sm text-body-md text-ink-muted">
                {courseTermLabel(outline.term)} ·{' '}
                {yearLevelLabel(outline.yearLevel)}
              </p>
            )}
          </div>

          {outline && (
            <Link
              to={`/teacher/subjects/${outline.id}/students`}
              className={buttonClasses('secondary', 'shrink-0')}
            >
              <Users className="size-4" aria-hidden="true" />
              Students
            </Link>
          )}
        </div>

        <TeacherAccessGate onOpenAuth={onOpenAuth}>
          {isLoading && <OutlineSkeleton />}
          {!isLoading && notFound && <NotFound />}
          {!isLoading && !notFound && loadError && (
            <OutlineError message={loadError} onRetry={handleRetry} />
          )}
          {!isLoading && !notFound && !loadError && outline && (
            <>
              <div className="mt-xl grid gap-lg md:grid-cols-2">
                <TopicForm onCreate={handleCreateTopic} />
                <LessonForm
                  topics={outline.topics}
                  onCreate={handleCreateLesson}
                />
              </div>

              {(actionError || actionMessage) && (
                <div className="mt-lg">
                  {actionError ? (
                    <FormAlert message={actionError} />
                  ) : (
                    <div
                      role="status"
                      aria-live="polite"
                      className="flex items-start gap-xs rounded-md border border-accent-green/30 bg-canvas-soft p-sm text-body-sm text-ink"
                    >
                      <CheckCircle2
                        className="mt-xxs size-4 shrink-0 text-accent-green"
                        aria-hidden="true"
                      />
                      <p>{actionMessage}</p>
                    </div>
                  )}
                </div>
              )}

              <TableOfContents
                topics={outline.topics}
                onMoveTopic={handleMoveTopic}
                onEditTopic={(topic) => {
                  clearActionFeedback()
                  setEditTarget({ kind: 'topic', topic })
                }}
                onDeleteTopic={(topic) => {
                  clearActionFeedback()
                  setDeleteTarget({ kind: 'topic', topic })
                }}
                onManageContent={(topic) => {
                  openTopic(topic)
                }}
                onMakeQuiz={(topic) => {
                  openTopic(topic, 'quiz')
                }}
                onViewResults={openTopicResults}
                onMoveLesson={handleMoveLesson}
                onEditLesson={(topicId, lesson) => {
                  clearActionFeedback()
                  setEditTarget({ kind: 'lesson', topicId, lesson })
                }}
                onDeleteLesson={(topicId, lesson) => {
                  clearActionFeedback()
                  setDeleteTarget({ kind: 'lesson', topicId, lesson })
                }}
                onReorderTopics={handleReorderTopics}
                onReorderLessons={handleReorderLessons}
              />

              {courseId && accessToken && (
                <TrashPanel
                  courseId={courseId}
                  accessToken={accessToken}
                  onRestored={handleRestored}
                />
              )}

              {editTarget?.kind === 'topic' && (
                <EditTopicDialog
                  title={editTarget.topic.title}
                  onSave={(title) => handleUpdateTopic(editTarget.topic, title)}
                  onClose={() => setEditTarget(null)}
                />
              )}

              {editTarget?.kind === 'lesson' && (
                <EditLessonDialog
                  lesson={editTarget.lesson}
                  topics={outline.topics}
                  onSave={(input) =>
                    handleUpdateLesson(
                      editTarget.topicId,
                      editTarget.lesson,
                      input,
                    )
                  }
                  onClose={() => setEditTarget(null)}
                />
              )}

              {deleteTarget?.kind === 'topic' && (
                <ConfirmDeleteDialog
                  title="Delete topic?"
                  description={`Delete “${deleteTarget.topic.title}”? Its lessons will also be deleted. You can restore the topic from Deleted items.`}
                  onConfirm={() => handleDeleteTopic(deleteTarget.topic)}
                  onClose={() => setDeleteTarget(null)}
                />
              )}

              {deleteTarget?.kind === 'lesson' && (
                <ConfirmDeleteDialog
                  title="Delete lesson?"
                  description={`Delete “${deleteTarget.lesson.title}”? You can restore it from Deleted items.`}
                  onConfirm={() =>
                    handleDeleteLesson(
                      deleteTarget.topicId,
                      deleteTarget.lesson,
                    )
                  }
                  onClose={() => setDeleteTarget(null)}
                />
              )}
            </>
          )}
        </TeacherAccessGate>
      </Container>
    </section>
  )
}
