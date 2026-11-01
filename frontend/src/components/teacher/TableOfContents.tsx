import { BookOpen } from 'lucide-react'
import type { CourseTopic } from '../../types/courseOutline'

type TableOfContentsProps = {
  topics: CourseTopic[]
}

function TopicCard({ topic, index }: { topic: CourseTopic; index: number }) {
  return (
    <li className="rounded-lg border border-hairline bg-surface p-lg">
      <div className="flex items-start gap-sm">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas-soft text-body-sm font-medium text-ink-secondary">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-xs">
            <h3 className="text-title text-ink">{topic.title}</h3>
            <span className="rounded-full border border-hairline bg-canvas-soft px-xs py-xxs text-eyebrow text-ink-muted">
              {topic.lessons.length}{' '}
              {topic.lessons.length === 1 ? 'lesson' : 'lessons'}
            </span>
          </div>

          {topic.lessons.length === 0 ? (
            <p className="mt-sm text-body-sm text-ink-muted">
              No lessons in this topic yet.
            </p>
          ) : (
            <ol className="mt-sm flex flex-col gap-xs">
              {topic.lessons.map((lesson, lessonIndex) => (
                <li
                  key={lesson.id}
                  className="flex items-center gap-xs rounded-md bg-canvas-soft px-sm py-xs text-body-sm text-ink"
                >
                  <span className="text-eyebrow text-ink-faint">
                    {index + 1}.{lessonIndex + 1}
                  </span>
                  <span>{lesson.title}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </li>
  )
}

export function TableOfContents({ topics }: TableOfContentsProps) {
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
        <ol className="mt-md flex flex-col gap-md">
          {topics.map((topic, index) => (
            <TopicCard key={topic.id} topic={topic} index={index} />
          ))}
        </ol>
      )}
    </section>
  )
}
