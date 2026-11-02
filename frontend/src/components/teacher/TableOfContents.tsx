import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import clsx from 'clsx'
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  GripVertical,
  ListChecks,
  Pencil,
  Trash2,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { CourseTopic, Lesson } from '../../types/courseOutline'

const TOPIC_PREFIX = 'topic:'
const LESSON_PREFIX = 'lesson:'

function topicSortableId(id: string): string {
  return `${TOPIC_PREFIX}${id}`
}

function lessonSortableId(id: string): string {
  return `${LESSON_PREFIX}${id}`
}

type IconActionButtonProps = {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: ReactNode
}

function IconActionButton({
  label,
  onClick,
  disabled = false,
  danger = false,
  children,
}: IconActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'inline-flex size-11 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40',
        danger
          ? 'text-accent-orange-deep hover:bg-canvas-soft'
          : 'text-ink-muted hover:bg-canvas-soft hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

type TopicCardProps = {
  topic: CourseTopic
  index: number
  topicCount: number
  onMoveTopic: (topic: CourseTopic, offset: number) => void
  onEditTopic: (topic: CourseTopic) => void
  onDeleteTopic: (topic: CourseTopic) => void
  onManageContent: (topic: CourseTopic) => void
  onMakeQuiz: (topic: CourseTopic) => void
  onViewResults: (topic: CourseTopic) => void
  onMoveLesson: (topicId: string, lesson: Lesson, offset: number) => void
  onEditLesson: (topicId: string, lesson: Lesson) => void
  onDeleteLesson: (topicId: string, lesson: Lesson) => void
}

function TopicCard({
  topic,
  index,
  topicCount,
  onMoveTopic,
  onEditTopic,
  onDeleteTopic,
  onManageContent,
  onMakeQuiz,
  onViewResults,
  onMoveLesson,
  onEditLesson,
  onDeleteLesson,
}: TopicCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topicSortableId(topic.id) })

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={clsx(
        'rounded-lg border border-hairline bg-surface p-lg',
        isDragging && 'z-10 opacity-60',
      )}
    >
      <div className="flex items-start gap-sm">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder topic ${topic.title}`}
          title={`Reorder topic ${topic.title}`}
          className="inline-flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-ink-muted hover:bg-canvas-soft hover:text-ink active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <GripVertical className="size-5" aria-hidden="true" />
        </button>

        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas-soft text-body-sm font-medium text-ink-secondary">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-xs">
            <div>
              <h3 className="text-title text-ink">{topic.title}</h3>
              <span className="mt-xxs inline-flex rounded-full border border-hairline bg-canvas-soft px-xs py-xxs text-eyebrow text-ink-muted">
                {topic.lessons.length}{' '}
                {topic.lessons.length === 1 ? 'lesson' : 'lessons'}
              </span>
              <p className="mt-xxs text-caption text-ink-muted">
                Slides, docs, presentations, and quizzes
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-xxs">
              <button
                type="button"
                onClick={() => onManageContent(topic)}
                className="inline-flex min-h-11 items-center gap-xxs rounded-full bg-primary px-md text-body-sm font-medium text-on-primary transition-colors hover:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <FileText className="size-4" aria-hidden="true" />
                Manage content
              </button>
              <button
                type="button"
                onClick={() => onMakeQuiz(topic)}
                className="inline-flex min-h-11 items-center gap-xxs rounded-full border border-hairline bg-surface px-md text-body-sm font-medium text-ink transition-colors hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <ListChecks className="size-4" aria-hidden="true" />
                Make a quiz
              </button>
              <button
                type="button"
                onClick={() => onViewResults(topic)}
                className="inline-flex min-h-11 items-center gap-xxs rounded-full border border-hairline bg-surface px-md text-body-sm font-medium text-ink transition-colors hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <BarChart3 className="size-4" aria-hidden="true" />
                Results
              </button>
              <IconActionButton
                label={`Move topic ${topic.title} up`}
                onClick={() => onMoveTopic(topic, -1)}
                disabled={index === 0}
              >
                <ChevronUp className="size-4" aria-hidden="true" />
              </IconActionButton>
              <IconActionButton
                label={`Move topic ${topic.title} down`}
                onClick={() => onMoveTopic(topic, 1)}
                disabled={index === topicCount - 1}
              >
                <ChevronDown className="size-4" aria-hidden="true" />
              </IconActionButton>
              <IconActionButton
                label={`Edit topic ${topic.title}`}
                onClick={() => onEditTopic(topic)}
              >
                <Pencil className="size-4" aria-hidden="true" />
              </IconActionButton>
              <IconActionButton
                label={`Delete topic ${topic.title}`}
                onClick={() => onDeleteTopic(topic)}
                danger
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </IconActionButton>
            </div>
          </div>

          {topic.lessons.length === 0 ? (
            <p className="mt-sm text-body-sm text-ink-muted">
              No lessons in this topic yet.
            </p>
          ) : (
            <SortableContext
              items={topic.lessons.map((lesson) => lessonSortableId(lesson.id))}
              strategy={verticalListSortingStrategy}
            >
              <ol className="mt-sm flex flex-col gap-xs">
                {topic.lessons.map((lesson, lessonIndex) => (
                  <LessonRow
                    key={lesson.id}
                    topicId={topic.id}
                    lesson={lesson}
                    topicNumber={index + 1}
                    index={lessonIndex}
                    lessonCount={topic.lessons.length}
                    onMoveLesson={onMoveLesson}
                    onEditLesson={onEditLesson}
                    onDeleteLesson={onDeleteLesson}
                  />
                ))}
              </ol>
            </SortableContext>
          )}
        </div>
      </div>
    </li>
  )
}

type LessonRowProps = {
  topicId: string
  lesson: Lesson
  topicNumber: number
  index: number
  lessonCount: number
  onMoveLesson: (topicId: string, lesson: Lesson, offset: number) => void
  onEditLesson: (topicId: string, lesson: Lesson) => void
  onDeleteLesson: (topicId: string, lesson: Lesson) => void
}

function LessonRow({
  topicId,
  lesson,
  topicNumber,
  index,
  lessonCount,
  onMoveLesson,
  onEditLesson,
  onDeleteLesson,
}: LessonRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lessonSortableId(lesson.id) })

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={clsx(
        'flex flex-wrap items-center gap-xs rounded-md bg-canvas-soft px-sm py-xs text-body-sm text-ink',
        isDragging && 'z-10 opacity-60',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder lesson ${lesson.title}`}
        title={`Reorder lesson ${lesson.title}`}
        className="inline-flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-ink-muted hover:bg-surface hover:text-ink active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>

      <span className="w-8 shrink-0 text-eyebrow tabular-nums text-ink-faint">
        {topicNumber}.{index + 1}
      </span>
      <span className="min-w-0 flex-1">{lesson.title}</span>

      <div className="flex items-center gap-xxs">
        <IconActionButton
          label={`Move lesson ${lesson.title} up`}
          onClick={() => onMoveLesson(topicId, lesson, -1)}
          disabled={index === 0}
        >
          <ChevronUp className="size-4" aria-hidden="true" />
        </IconActionButton>
        <IconActionButton
          label={`Move lesson ${lesson.title} down`}
          onClick={() => onMoveLesson(topicId, lesson, 1)}
          disabled={index === lessonCount - 1}
        >
          <ChevronDown className="size-4" aria-hidden="true" />
        </IconActionButton>
        <IconActionButton
          label={`Edit lesson ${lesson.title}`}
          onClick={() => onEditLesson(topicId, lesson)}
        >
          <Pencil className="size-4" aria-hidden="true" />
        </IconActionButton>
        <IconActionButton
          label={`Delete lesson ${lesson.title}`}
          onClick={() => onDeleteLesson(topicId, lesson)}
          danger
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </IconActionButton>
      </div>
    </li>
  )
}

type TableOfContentsProps = {
  topics: CourseTopic[]
  onMoveTopic: (topic: CourseTopic, offset: number) => void
  onEditTopic: (topic: CourseTopic) => void
  onDeleteTopic: (topic: CourseTopic) => void
  onManageContent: (topic: CourseTopic) => void
  onMakeQuiz: (topic: CourseTopic) => void
  onViewResults: (topic: CourseTopic) => void
  onMoveLesson: (topicId: string, lesson: Lesson, offset: number) => void
  onEditLesson: (topicId: string, lesson: Lesson) => void
  onDeleteLesson: (topicId: string, lesson: Lesson) => void
  onReorderTopics: (topicIds: string[]) => void
  onReorderLessons: (topicId: string, lessonIds: string[]) => void
}

export function TableOfContents({
  topics,
  onMoveTopic,
  onEditTopic,
  onDeleteTopic,
  onManageContent,
  onMakeQuiz,
  onViewResults,
  onMoveLesson,
  onEditLesson,
  onDeleteLesson,
  onReorderTopics,
  onReorderLessons,
}: TableOfContentsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const activeId = String(active.id)
    const overId = String(over.id)

    if (activeId.startsWith(TOPIC_PREFIX) && overId.startsWith(TOPIC_PREFIX)) {
      const oldIndex = topics.findIndex(
        (topic) => topicSortableId(topic.id) === activeId,
      )
      const newIndex = topics.findIndex(
        (topic) => topicSortableId(topic.id) === overId,
      )

      if (oldIndex >= 0 && newIndex >= 0) {
        onReorderTopics(
          arrayMove(topics, oldIndex, newIndex).map((topic) => topic.id),
        )
      }

      return
    }

    if (
      activeId.startsWith(LESSON_PREFIX) &&
      overId.startsWith(LESSON_PREFIX)
    ) {
      const activeLessonId = activeId.slice(LESSON_PREFIX.length)
      const overLessonId = overId.slice(LESSON_PREFIX.length)
      const sourceTopic = topics.find((topic) =>
        topic.lessons.some((lesson) => lesson.id === activeLessonId),
      )
      const targetTopic = topics.find((topic) =>
        topic.lessons.some((lesson) => lesson.id === overLessonId),
      )

      if (!sourceTopic || !targetTopic || sourceTopic.id !== targetTopic.id) {
        return
      }

      const oldIndex = sourceTopic.lessons.findIndex(
        (lesson) => lesson.id === activeLessonId,
      )
      const newIndex = sourceTopic.lessons.findIndex(
        (lesson) => lesson.id === overLessonId,
      )

      if (oldIndex >= 0 && newIndex >= 0) {
        onReorderLessons(
          sourceTopic.id,
          arrayMove(sourceTopic.lessons, oldIndex, newIndex).map(
            (lesson) => lesson.id,
          ),
        )
      }
    }
  }

  return (
    <section aria-labelledby="table-of-contents-heading" className="mt-xl">
      <div className="flex items-center justify-between gap-md">
        <h2 id="table-of-contents-heading" className="text-heading-3">
          Table of contents
        </h2>
        {topics.length > 0 && (
          <span className="rounded-full border border-hairline bg-surface px-xs py-xxs text-eyebrow text-ink-muted">
            {topics.length} {topics.length === 1 ? 'topic' : 'topics'}
          </span>
        )}
      </div>

      {topics.length === 0 ? (
        <div className="mt-md rounded-lg border border-dashed border-hairline bg-canvas-soft p-xl text-center">
          <BookOpen
            className="mx-auto size-8 text-ink-faint"
            aria-hidden="true"
          />
          <h3 className="mt-sm text-title text-ink">No topics yet</h3>
          <p className="mt-xxs text-body-sm text-ink-muted">
            Add your first topic to start building the table of contents.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={topics.map((topic) => topicSortableId(topic.id))}
            strategy={verticalListSortingStrategy}
          >
            <ol className="mt-md flex flex-col gap-md">
              {topics.map((topic, index) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  index={index}
                  topicCount={topics.length}
                  onMoveTopic={onMoveTopic}
                  onEditTopic={onEditTopic}
                  onDeleteTopic={onDeleteTopic}
                  onManageContent={onManageContent}
                  onMakeQuiz={onMakeQuiz}
                  onViewResults={onViewResults}
                  onMoveLesson={onMoveLesson}
                  onEditLesson={onEditLesson}
                  onDeleteLesson={onDeleteLesson}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
    </section>
  )
}
