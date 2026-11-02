import { FileText, ListChecks, Presentation, Upload } from 'lucide-react'
import clsx from 'clsx'
import { useRef } from 'react'
import type { KeyboardEvent } from 'react'

export type TopicTab = 'pptx' | 'docs' | 'upload' | 'quiz'

const TABS: readonly {
  id: TopicTab
  label: string
  icon: typeof Presentation
}[] = [
  { id: 'pptx', label: 'PPTX', icon: Presentation },
  { id: 'docs', label: 'Docs', icon: FileText },
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'quiz', label: 'Quiz', icon: ListChecks },
]

type TopicTabsProps = {
  activeTab: TopicTab
  onChange: (tab: TopicTab) => void
}

export function TopicTabs({ activeTab, onChange }: TopicTabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const moveFocus = (index: number) => {
    const next = TABS[index]

    if (!next) {
      return
    }

    tabRefs.current[index]?.focus()
    onChange(next.id)
  }

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveFocus((index + 1) % TABS.length)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveFocus((index - 1 + TABS.length) % TABS.length)
    } else if (event.key === 'Home') {
      event.preventDefault()
      moveFocus(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      moveFocus(TABS.length - 1)
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Topic content"
      className="mt-lg flex flex-wrap gap-xxs border-b border-hairline"
    >
      {TABS.map((tab, index) => {
        const isActive = tab.id === activeTab
        const Icon = tab.icon

        return (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[index] = element
            }}
            type="button"
            role="tab"
            id={`topic-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`topic-panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={clsx(
              'inline-flex min-h-11 items-center gap-xxs border-b-2 px-sm text-body-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              isActive
                ? 'border-primary text-ink'
                : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
